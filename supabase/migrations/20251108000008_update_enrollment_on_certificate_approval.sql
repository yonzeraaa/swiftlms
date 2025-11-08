-- ============================================================================
-- Atualizar enrollment para 'completed' quando certificado for aprovado
-- ============================================================================

DROP FUNCTION IF EXISTS approve_certificate_request(uuid, uuid);

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

  -- 3. Verificar se já existe certificado para este enrollment + tipo
  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id
    AND certificate_type = COALESCE(v_request.certificate_type, 'technical');

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
      approved_by,
      certificate_type
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
      p_admin_id,
      COALESCE(v_request.certificate_type, 'technical')
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

  -- 7. Atualizar enrollment para 'completed' e definir data de conclusão
  UPDATE enrollments
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, now()),
    progress_percentage = 100,
    updated_at = now()
  WHERE id = v_request.enrollment_id
    AND status != 'completed'; -- Só atualiza se ainda não estiver concluído

  -- 8. Registrar atividade
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
      'user_id', v_request.user_id,
      'certificate_type', COALESCE(v_request.certificate_type, 'technical')
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
      'message', 'Já existe um certificado deste tipo para esta matrícula'
    );
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving certificate: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION approve_certificate_request IS
'Aprova uma solicitação de certificado e marca o enrollment como completed';
