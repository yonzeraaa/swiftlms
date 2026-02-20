-- ============================================================================
-- Corrigir auditoria de approved_by nas funções de certificado
-- ============================================================================
-- Problema: approve_certificate_request e reject_certificate_request gravavam
-- approved_by = p_admin_id (parâmetro fornecido pelo cliente), em vez de
-- auth.uid() (identidade verificada). Um admin poderia forjar o campo de auditoria
-- passando outro UUID como p_admin_id.
-- Solução: usar auth.uid() diretamente para approved_by.
-- ============================================================================

DROP FUNCTION IF EXISTS approve_certificate_request(uuid, uuid);

CREATE OR REPLACE FUNCTION approve_certificate_request(
  p_request_id uuid,
  p_admin_id uuid  -- mantido por compatibilidade com callers existentes; ignorado internamente
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
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
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: apenas administradores podem aprovar certificados'
    );
  END IF;

  SELECT * INTO v_request FROM certificate_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta solicitação já foi processada');
  END IF;

  SELECT * INTO v_enrollment FROM enrollments WHERE id = v_request.enrollment_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;
  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;

  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id
    AND certificate_type = COALESCE(v_request.certificate_type, 'technical');

  v_instructor_name := 'SwiftEDU Team';
  IF v_course.instructor_id IS NOT NULL THEN
    SELECT full_name INTO v_instructor_name FROM profiles WHERE id = v_course.instructor_id;
  END IF;

  IF v_existing_certificate IS NOT NULL THEN
    UPDATE certificates
    SET
      status = 'issued',
      approval_status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),  -- auditoria: quem realmente aprovou
      issued_at = now(),
      grade = COALESCE(v_enrollment.progress_percentage, 100),
      course_hours = v_course.duration_hours,
      instructor_name = v_instructor_name,
      updated_at = now()
    WHERE id = v_existing_certificate
    RETURNING id INTO v_certificate_id;
  ELSE
    v_certificate_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 8));
    v_verification_code := upper(substr(md5(random()::text || now()::text), 1, 16));

    INSERT INTO certificates (
      user_id, course_id, enrollment_id,
      certificate_number, verification_code,
      status, issued_at, grade, instructor_name, course_hours,
      approval_status, approved_at, approved_by, certificate_type
    ) VALUES (
      v_request.user_id, v_request.course_id, v_request.enrollment_id,
      v_certificate_number, v_verification_code,
      'issued', now(),
      COALESCE(v_enrollment.progress_percentage, 100),
      v_instructor_name, v_course.duration_hours,
      'approved', now(), auth.uid(), -- auditoria: quem realmente aprovou
      COALESCE(v_request.certificate_type, 'technical')
    )
    RETURNING id INTO v_certificate_id;
  END IF;

  UPDATE certificate_requests
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = p_request_id;

  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    auth.uid(), 'certificate_approved', 'certificate', v_certificate_id,
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
    RETURN jsonb_build_object('success', false, 'message', 'Já existe um certificado deste tipo para esta matrícula');
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving certificate: %', SQLERRM;
END;
$$;


DROP FUNCTION IF EXISTS reject_certificate_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION reject_certificate_request(
  p_request_id uuid,
  p_admin_id uuid,  -- mantido por compatibilidade; ignorado internamente
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_request record;
  v_user record;
  v_course record;
  v_existing_certificate uuid;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: apenas administradores podem rejeitar certificados'
    );
  END IF;

  SELECT * INTO v_request FROM certificate_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta solicitação já foi processada');
  END IF;

  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;

  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id
    AND certificate_type = COALESCE(v_request.certificate_type, 'technical')
    AND approval_status = 'pending';

  IF v_existing_certificate IS NOT NULL THEN
    UPDATE certificates
    SET
      approval_status = 'rejected',
      rejection_reason = p_reason,
      approved_by = auth.uid(),  -- auditoria: quem realmente rejeitou
      approved_at = now(),
      updated_at = now()
    WHERE id = v_existing_certificate;
  END IF;

  UPDATE certificate_requests
  SET
    status = 'rejected',
    processed_at = now(),
    processed_by = auth.uid(),
    notes = p_reason
  WHERE id = p_request_id;

  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    auth.uid(), 'certificate_rejected', 'certificate_request', p_request_id,
    'Solicitação de ' || v_user.full_name || ' - ' || v_course.title,
    jsonb_build_object(
      'reason', p_reason,
      'enrollment_id', v_request.enrollment_id,
      'course_id', v_request.course_id,
      'user_id', v_request.user_id,
      'certificate_type', COALESCE(v_request.certificate_type, 'technical')
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Solicitação rejeitada com sucesso');

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting certificate: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION approve_certificate_request IS
'Aprova certificado. Restrito a admins. Define status=issued e approved_by=auth.uid().';

COMMENT ON FUNCTION reject_certificate_request IS
'Rejeita certificado. Restrito a admins. Define approved_by=auth.uid() para auditoria.';
