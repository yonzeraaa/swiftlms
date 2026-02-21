-- ============================================================================
-- Concorrência e idempotência no fluxo de aprovação/rejeição
-- ============================================================================
-- Problemas resolvidos:
--   1. Corrida entre dois admins aprovando ao mesmo tempo:
--      SELECT...FOR UPDATE bloqueia a row de certificate_requests até o
--      fim da transação, garantindo que o segundo admin veja status != 'pending'.
--   2. Aprovar duas vezes retorna o mesmo certificate_id sem efeitos colaterais:
--      se o request já está 'approved', a função localiza e retorna o certificado
--      existente ao invés de falhar com erro.
-- ============================================================================


-- approve_certificate_request: FOR UPDATE + idempotência
-- ============================================================================
DROP FUNCTION IF EXISTS approve_certificate_request(uuid, uuid);

CREATE OR REPLACE FUNCTION approve_certificate_request(
  p_request_id uuid,
  p_admin_id uuid  -- mantido por compatibilidade; internamente usa auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_request      record;
  v_enrollment   record;
  v_course       record;
  v_user         record;
  v_existing_certificate uuid;
  v_certificate_id uuid;
  v_certificate_number text;
  v_verification_code  text;
  v_instructor_name    text;
BEGIN
  -- Verificar role antes de bloquear qualquer row
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acesso negado: apenas administradores podem aprovar certificados');
  END IF;

  -- FOR UPDATE: serializa aprovações concorrentes do mesmo request
  SELECT * INTO v_request FROM certificate_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  -- Idempotência: se já foi aprovado, retornar o certificado existente sem reprocessar
  IF v_request.status = 'approved' THEN
    SELECT id INTO v_certificate_id
    FROM certificates
    WHERE enrollment_id = v_request.enrollment_id
      AND certificate_type = COALESCE(v_request.certificate_type, 'technical');

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Certificado já havia sido aprovado anteriormente',
      'certificate_id', v_certificate_id,
      'idempotent', true
    );
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

  -- O trigger sync_certificate_state garante status='issued' automaticamente
  IF v_existing_certificate IS NOT NULL THEN
    UPDATE certificates
    SET
      approval_status  = 'approved',
      approved_at      = now(),
      approved_by      = auth.uid(),
      issued_at        = now(),
      grade            = COALESCE(v_enrollment.progress_percentage, 100),
      course_hours     = v_course.duration_hours,
      instructor_name  = v_instructor_name,
      updated_at       = now()
    WHERE id = v_existing_certificate
    RETURNING id INTO v_certificate_id;
  ELSE
    v_certificate_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 8));
    v_verification_code  := upper(substr(md5(random()::text || now()::text), 1, 16));

    INSERT INTO certificates (
      user_id, course_id, enrollment_id,
      certificate_number, verification_code,
      approval_status, approved_at, approved_by,
      issued_at, grade, instructor_name, course_hours,
      certificate_type
    ) VALUES (
      v_request.user_id, v_request.course_id, v_request.enrollment_id,
      v_certificate_number, v_verification_code,
      'approved', now(), auth.uid(),
      now(), COALESCE(v_enrollment.progress_percentage, 100),
      v_instructor_name, v_course.duration_hours,
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

  RETURN jsonb_build_object('success', true, 'message', 'Certificado aprovado com sucesso', 'certificate_id', v_certificate_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Já existe um certificado deste tipo para esta matrícula');
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving certificate: %', SQLERRM;
END;
$$;


-- reject_certificate_request: FOR UPDATE
-- ============================================================================
DROP FUNCTION IF EXISTS reject_certificate_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION reject_certificate_request(
  p_request_id uuid,
  p_admin_id uuid,  -- mantido por compatibilidade; internamente usa auth.uid()
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_request     record;
  v_user        record;
  v_course      record;
  v_existing_certificate uuid;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acesso negado: apenas administradores podem rejeitar certificados');
  END IF;

  -- FOR UPDATE: serializa operações concorrentes no mesmo request
  SELECT * INTO v_request FROM certificate_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  -- Idempotência: se já rejeitado, retornar sucesso sem reprocessar
  IF v_request.status = 'rejected' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Solicitação já havia sido rejeitada', 'idempotent', true);
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
      approval_status  = 'rejected',
      rejection_reason = p_reason,
      approved_by      = auth.uid(),
      approved_at      = now(),
      updated_at       = now()
    WHERE id = v_existing_certificate;
  END IF;

  UPDATE certificate_requests
  SET status = 'rejected', processed_at = now(), processed_by = auth.uid(), notes = p_reason
  WHERE id = p_request_id;

  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    auth.uid(), 'certificate_rejected', 'certificate_request', p_request_id,
    'Solicitação de ' || v_user.full_name || ' - ' || v_course.title,
    jsonb_build_object('reason', p_reason, 'enrollment_id', v_request.enrollment_id, 'course_id', v_request.course_id, 'user_id', v_request.user_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Solicitação rejeitada com sucesso');

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting certificate: %', SQLERRM;
END;
$$;


COMMENT ON FUNCTION approve_certificate_request IS
'Aprova certificado. FOR UPDATE evita corrida. Idempotente: segunda chamada retorna cert existente.';

COMMENT ON FUNCTION reject_certificate_request IS
'Rejeita certificado. FOR UPDATE evita corrida. Idempotente: segunda chamada retorna sucesso.';
