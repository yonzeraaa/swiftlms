-- ============================================================================
-- Hardening de Segurança — Fluxo de Certificados
-- ============================================================================
-- Problemas corrigidos:
--   1. RPCs sem proteção de role acessíveis por anon
--   2. Política INSERT permissiva em certificates
--   3. Verificador público quebrado (404 para visitantes)
--   4. Inconsistência status/approval_status nos certificados aprovados
--   5. update_certificate_requirements referencia coluna inexistente
--   6. 4 aprovações sem certificado correspondente
--   7. Índices FK ausentes
-- ============================================================================


-- 1. REVOGAR EXECUTE de anon em todos os RPCs de mutação
-- ============================================================================
REVOKE EXECUTE ON FUNCTION approve_certificate_request(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION reject_certificate_request(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION manually_generate_certificate(uuid) FROM anon;

-- Estas são chamadas por estudantes autenticados, mas anon não deve ter acesso
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_certificate_request') THEN
    REVOKE EXECUTE ON FUNCTION create_certificate_request(uuid) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_certificate_requirements') THEN
    REVOKE EXECUTE ON FUNCTION update_certificate_requirements(uuid) FROM anon;
  END IF;
END;
$$;


-- 2. Recriar approve_certificate_request com role check + search_path + status='issued'
-- ============================================================================
-- O bug crítico: o RPC setava approval_status='approved' mas não status='issued',
-- fazendo o verificador público (`status === 'issued'`) mostrar certificado inválido.
-- ============================================================================
DROP FUNCTION IF EXISTS approve_certificate_request(uuid, uuid);

CREATE OR REPLACE FUNCTION approve_certificate_request(
  p_request_id uuid,
  p_admin_id uuid
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
  -- Verificar se o chamador é admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: apenas administradores podem aprovar certificados'
    );
  END IF;

  -- Buscar request
  SELECT * INTO v_request
  FROM certificate_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta solicitação já foi processada');
  END IF;

  -- Buscar dados relacionados
  SELECT * INTO v_enrollment FROM enrollments WHERE id = v_request.enrollment_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;
  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;

  -- Verificar se já existe certificado para este enrollment + tipo
  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = v_request.enrollment_id
    AND certificate_type = COALESCE(v_request.certificate_type, 'technical');

  -- Buscar nome do instrutor
  v_instructor_name := 'SwiftEDU Team';
  IF v_course.instructor_id IS NOT NULL THEN
    SELECT full_name INTO v_instructor_name
    FROM profiles
    WHERE id = v_course.instructor_id;
  END IF;

  -- Criar ou atualizar certificado, garantindo status = 'issued'
  IF v_existing_certificate IS NOT NULL THEN
    UPDATE certificates
    SET
      status = 'issued',
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
      'approved', now(), p_admin_id,
      COALESCE(v_request.certificate_type, 'technical')
    )
    RETURNING id INTO v_certificate_id;
  END IF;

  -- Atualizar status da solicitação
  UPDATE certificate_requests
  SET status = 'approved', processed_at = now(), processed_by = p_admin_id
  WHERE id = p_request_id;

  -- Registrar atividade
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    p_admin_id, 'certificate_approved', 'certificate', v_certificate_id,
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


-- 3. Recriar reject_certificate_request com role check + search_path
-- ============================================================================
DROP FUNCTION IF EXISTS reject_certificate_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION reject_certificate_request(
  p_request_id uuid,
  p_admin_id uuid,
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
  -- Verificar se o chamador é admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: apenas administradores podem rejeitar certificados'
    );
  END IF;

  -- Buscar request
  SELECT * INTO v_request
  FROM certificate_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta solicitação já foi processada');
  END IF;

  -- Buscar dados relacionados
  SELECT * INTO v_user FROM profiles WHERE id = v_request.user_id;
  SELECT * INTO v_course FROM courses WHERE id = v_request.course_id;

  -- Verificar e atualizar certificado pendente
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
      approved_by = p_admin_id,
      approved_at = now(),
      updated_at = now()
    WHERE id = v_existing_certificate;
  END IF;

  -- Atualizar status da solicitação
  UPDATE certificate_requests
  SET
    status = 'rejected',
    processed_at = now(),
    processed_by = p_admin_id,
    notes = p_reason
  WHERE id = p_request_id;

  -- Registrar atividade
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    p_admin_id, 'certificate_rejected', 'certificate_request', p_request_id,
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


-- 4. Recriar manually_generate_certificate com role check + search_path
-- ============================================================================
-- Função existe apenas em produção (migration drift) — incluindo CREATE OR REPLACE completo.
-- Gera certificado técnico diretamente para um enrollment, sem passar pelo fluxo de request.
-- ============================================================================
DROP FUNCTION IF EXISTS manually_generate_certificate(uuid);

CREATE OR REPLACE FUNCTION manually_generate_certificate(
  p_enrollment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_enrollment record;
  v_course record;
  v_user record;
  v_existing_certificate uuid;
  v_certificate_id uuid;
  v_certificate_number text;
  v_verification_code text;
  v_instructor_name text;
BEGIN
  -- Verificar se o chamador é admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: apenas administradores podem gerar certificados manualmente'
    );
  END IF;

  -- Buscar dados da matrícula
  SELECT * INTO v_enrollment FROM enrollments WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Matrícula não encontrada');
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = v_enrollment.course_id;
  SELECT * INTO v_user FROM profiles WHERE id = v_enrollment.user_id;

  -- Verificar se já existe certificado técnico para esta matrícula
  SELECT id INTO v_existing_certificate
  FROM certificates
  WHERE enrollment_id = p_enrollment_id
    AND certificate_type = 'technical';

  IF v_existing_certificate IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Já existe um certificado técnico para esta matrícula',
      'certificate_id', v_existing_certificate
    );
  END IF;

  -- Buscar nome do instrutor
  v_instructor_name := 'SwiftEDU Team';
  IF v_course.instructor_id IS NOT NULL THEN
    SELECT full_name INTO v_instructor_name
    FROM profiles
    WHERE id = v_course.instructor_id;
  END IF;

  -- Gerar códigos únicos
  v_certificate_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 8));
  v_verification_code := upper(substr(md5(random()::text || now()::text), 1, 16));

  -- Inserir certificado
  INSERT INTO certificates (
    user_id, course_id, enrollment_id,
    certificate_number, verification_code,
    status, issued_at, grade, instructor_name, course_hours,
    approval_status, approved_at, approved_by, certificate_type
  ) VALUES (
    v_enrollment.user_id, v_enrollment.course_id, p_enrollment_id,
    v_certificate_number, v_verification_code,
    'issued', now(),
    COALESCE(v_enrollment.progress_percentage, 100),
    v_instructor_name, v_course.duration_hours,
    'approved', now(), auth.uid(), 'technical'
  )
  RETURNING id INTO v_certificate_id;

  -- Registrar atividade
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (
    auth.uid(), 'certificate_manually_generated', 'certificate', v_certificate_id,
    'Certificado gerado para ' || v_user.full_name || ' - ' || v_course.title,
    jsonb_build_object(
      'enrollment_id', p_enrollment_id,
      'course_id', v_enrollment.course_id,
      'user_id', v_enrollment.user_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Certificado gerado com sucesso',
    'certificate_id', v_certificate_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Já existe um certificado para esta matrícula');
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error generating certificate: %', SQLERRM;
END;
$$;


-- 5. Corrigir update_certificate_requirements
-- ============================================================================
-- Problema: referenciava test_attempts.status (coluna inexistente).
-- A verificação correta usa lesson_progress e test_grades (mesmo padrão da API).
-- ============================================================================
CREATE OR REPLACE FUNCTION update_certificate_requirements(
  p_enrollment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment record;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_progress_pct integer;
  v_best_test_score numeric;
  v_can_generate boolean;
  v_message text;
BEGIN
  -- Verificar se o enrollment pertence ao usuário atual
  SELECT * INTO v_enrollment
  FROM enrollments
  WHERE id = p_enrollment_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_generate', false,
      'message', 'Matrícula não encontrada ou acesso negado',
      'details', '{}'::jsonb
    );
  END IF;

  -- Contar total de lições no curso
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l
  JOIN course_modules m ON l.module_id = m.id
  WHERE m.course_id = v_enrollment.course_id;

  -- Contar lições concluídas no enrollment
  SELECT COUNT(*) INTO v_completed_lessons
  FROM lesson_progress lp
  WHERE lp.enrollment_id = p_enrollment_id
    AND lp.is_completed = true;

  -- Calcular percentual de progresso
  v_progress_pct := CASE
    WHEN v_total_lessons > 0 THEN (v_completed_lessons * 100 / v_total_lessons)
    ELSE 0
  END;

  -- Buscar melhor nota em testes do curso
  SELECT COALESCE(MAX(tg.best_score), 0) INTO v_best_test_score
  FROM test_grades tg
  WHERE tg.user_id = auth.uid()
    AND tg.course_id = v_enrollment.course_id;

  -- Requisitos: 100% de progresso + nota mínima 70
  v_can_generate := (v_progress_pct >= 100 AND v_best_test_score >= 70);

  IF v_can_generate THEN
    v_message := 'Você atende a todos os requisitos para solicitar o certificado';
  ELSIF v_progress_pct < 100 THEN
    v_message := 'Conclua todas as aulas antes de solicitar o certificado';
  ELSE
    v_message := 'Nota mínima de 70 pontos nos testes é necessária';
  END IF;

  -- Upsert na tabela de controle de requisitos
  INSERT INTO certificate_requirements (
    enrollment_id, user_id, course_id,
    all_lessons_completed, total_lessons, completed_lessons,
    requirements_met, checked_at, updated_at
  ) VALUES (
    p_enrollment_id, auth.uid(), v_enrollment.course_id,
    (v_progress_pct >= 100), v_total_lessons, v_completed_lessons,
    v_can_generate, now(), now()
  )
  ON CONFLICT (enrollment_id) DO UPDATE SET
    all_lessons_completed = (v_progress_pct >= 100),
    total_lessons = v_total_lessons,
    completed_lessons = v_completed_lessons,
    requirements_met = v_can_generate,
    checked_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'can_generate', v_can_generate,
    'message', v_message,
    'details', jsonb_build_object(
      'progress_percentage', v_progress_pct,
      'total_lessons', v_total_lessons,
      'completed_lessons', v_completed_lessons,
      'best_test_score', v_best_test_score
    )
  );
END;
$$;


-- 6. Corrigir políticas RLS em certificates
-- ============================================================================
-- Remover política INSERT permissiva que permite alunos criarem certificados próprios.
-- Adicionar política restrita: apenas admins podem inserir diretamente.
-- (RPCs SECURITY DEFINER contornam RLS — INSERT via RPC continua funcionando.)
-- ============================================================================
DROP POLICY IF EXISTS "Users can create their own certificates" ON certificates;
DROP POLICY IF EXISTS "Only admins can insert certificates" ON certificates;

CREATE POLICY "Only admins can insert certificates" ON certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- 7. Reparar certificados faltantes para requests já aprovadas
-- ============================================================================
-- Inserir certificados para requests aprovadas que não têm certificado correspondente.
-- Usa status='issued' e approval_status='approved' para funcionar no verificador público.
-- ============================================================================
INSERT INTO certificates (
  user_id, course_id, enrollment_id,
  certificate_number, verification_code,
  status, issued_at, grade, course_hours,
  approval_status, approved_at, approved_by, certificate_type
)
SELECT
  cr.user_id,
  cr.course_id,
  cr.enrollment_id,
  'CERT-' || to_char(cr.processed_at, 'YYYYMMDD') || '-' || upper(substr(md5(cr.id::text), 1, 8)),
  upper(substr(md5(cr.id::text || cr.enrollment_id::text), 1, 16)),
  'issued',
  COALESCE(cr.processed_at, cr.request_date, now()),
  COALESCE(e.progress_percentage, 100),
  c.duration_hours,
  'approved',
  COALESCE(cr.processed_at, now()),
  cr.processed_by,
  COALESCE(cr.certificate_type, 'technical')
FROM certificate_requests cr
JOIN enrollments e ON e.id = cr.enrollment_id
JOIN courses c ON c.id = cr.course_id
WHERE cr.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM certificates cert
    WHERE cert.enrollment_id = cr.enrollment_id
      AND cert.certificate_type = COALESCE(cr.certificate_type, 'technical')
  );


-- 8. Índices FK ausentes para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_certificate_requests_processed_by ON certificate_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_certificates_approved_by ON certificates(approved_by);
CREATE INDEX IF NOT EXISTS idx_certificates_tcc_id ON certificates(tcc_id);


-- Comentários
-- ============================================================================
COMMENT ON FUNCTION approve_certificate_request IS
'Aprova uma solicitação de certificado. Restrito a admins. Define status=issued e approval_status=approved.';

COMMENT ON FUNCTION reject_certificate_request IS
'Rejeita uma solicitação de certificado. Restrito a admins.';

COMMENT ON FUNCTION manually_generate_certificate IS
'Gera certificado técnico diretamente sem passar pelo fluxo de request. Restrito a admins.';

COMMENT ON FUNCTION update_certificate_requirements IS
'Verifica e atualiza os requisitos de certificado para um enrollment do usuário autenticado.';
