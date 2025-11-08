-- ============================================================================
-- Corrigir função de aprovação de certificados
-- ============================================================================
-- Problema: tentava criar novo certificado mesmo quando já existia um pending
-- Solução: verificar e atualizar certificado existente
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS approve_certificate_request(uuid, uuid);
DROP FUNCTION IF EXISTS reject_certificate_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION approve_certificate_request(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request record;
  v_enrollment record;
  v_course record;
  v_user record;
  v_existing_certificate uuid;
  v_certificate_id uuid;
  v_certificate_number text;
  v_verification_code text;
  v_instructor_name text;
BEGIN
  -- 1. Buscar request
  SELECT * INTO v_request
  FROM certificate_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Solicitação não encontrada'
    );
  END IF;

  -- Verificar se já foi processada
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Esta solicitação já foi processada'
    );
  END IF;

  -- 2. Buscar dados relacionados
  SELECT * INTO v_enrollment FROM enrollments WHERE id = v_request.enrollment_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;
  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;

  -- 3. Verificar se já existe certificado para este enrollment
  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id;

  -- 4. Buscar nome do instrutor
  v_instructor_name := 'SwiftEDU Team';
  IF v_course.instructor_id IS NOT NULL THEN
    SELECT full_name INTO v_instructor_name
    FROM profiles
    WHERE id = v_course.instructor_id;
  END IF;

  -- 5. Criar ou atualizar certificado
  IF v_existing_certificate IS NOT NULL THEN
    -- Atualizar certificado existente
    UPDATE certificates
    SET
      approval_status = 'approved',
      approved_at = now(),
      approved_by = p_admin_id,
      issued_at = now(),
      grade = COALESCE(v_enrollment.progress_percentage, 100),
      course_hours = v_course.duration_hours,
      instructor_name = v_instructor_name,
      updated_at = now()
    WHERE id = v_existing_certificate
    RETURNING id INTO v_certificate_id;
  ELSE
    -- Gerar códigos únicos
    v_certificate_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);
    v_verification_code := substr(md5(random()::text || now()::text), 1, 16);

    -- Criar novo certificado
    INSERT INTO certificates (
      user_id,
      course_id,
      enrollment_id,
      certificate_number,
      verification_code,
      issued_at,
      grade,
      instructor_name,
      course_hours,
      approval_status,
      approved_at,
      approved_by
    ) VALUES (
      v_request.user_id,
      v_request.course_id,
      v_request.enrollment_id,
      v_certificate_number,
      v_verification_code,
      now(),
      COALESCE(v_enrollment.progress_percentage, 100),
      v_instructor_name,
      v_course.duration_hours,
      'approved',
      now(),
      p_admin_id
    )
    RETURNING id INTO v_certificate_id;
  END IF;

  -- 6. Atualizar status da solicitação
  UPDATE certificate_requests
  SET
    status = 'approved',
    processed_at = now(),
    processed_by = p_admin_id
  WHERE id = p_request_id;

  -- 7. Registrar atividade
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    p_admin_id,
    'certificate_approved',
    'certificate',
    v_certificate_id,
    'Certificado para ' || v_user.full_name || ' - ' || v_course.title,
    jsonb_build_object(
      'request_id', p_request_id,
      'enrollment_id', v_request.enrollment_id,
      'course_id', v_request.course_id,
      'user_id', v_request.user_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Certificado aprovado com sucesso',
    'certificate_id', v_certificate_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Já existe um certificado para esta matrícula'
    );
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving certificate: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Função de rejeição de certificado
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_certificate_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request record;
  v_user record;
  v_course record;
  v_existing_certificate uuid;
BEGIN
  -- 1. Buscar request
  SELECT * INTO v_request
  FROM certificate_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Solicitação não encontrada'
    );
  END IF;

  -- Verificar se já foi processada
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Esta solicitação já foi processada'
    );
  END IF;

  -- 2. Buscar dados relacionados
  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;

  -- 3. Verificar se existe certificado pendente
  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id
    AND approval_status = 'pending';

  -- 4. Atualizar certificado se existir
  IF v_existing_certificate IS NOT NULL THEN
    UPDATE certificates
    SET
      approval_status = 'rejected',
      rejection_reason = p_reason,
      approved_by = p_admin_id,
      approved_at = now(),
      updated_at = now()
    WHERE id = v_existing_certificate;
  END IF;

  -- 5. Atualizar status da solicitação
  UPDATE certificate_requests
  SET
    status = 'rejected',
    processed_at = now(),
    processed_by = p_admin_id,
    notes = p_reason
  WHERE id = p_request_id;

  -- 6. Registrar atividade
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    p_admin_id,
    'certificate_rejected',
    'certificate_request',
    p_request_id,
    'Solicitação de ' || v_user.full_name || ' - ' || v_course.title,
    jsonb_build_object(
      'reason', p_reason,
      'enrollment_id', v_request.enrollment_id,
      'course_id', v_request.course_id,
      'user_id', v_request.user_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Solicitação rejeitada com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting certificate: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Comentários
-- ============================================================================
COMMENT ON FUNCTION approve_certificate_request IS
'Aprova uma solicitação de certificado. Se já existir certificado pending, atualiza-o. Caso contrário, cria novo.';

COMMENT ON FUNCTION reject_certificate_request IS
'Rejeita uma solicitação de certificado e atualiza certificado existente se houver.';
