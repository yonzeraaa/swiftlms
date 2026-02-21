-- ============================================================================
-- Detecção de anomalias em certificados
-- ============================================================================
-- Função chamável pelo painel admin para alertar sobre inconsistências.
-- Retorna uma row por tipo de anomalia com contagem e sample de IDs afetados.
-- ============================================================================

CREATE OR REPLACE FUNCTION certificate_anomaly_report()
RETURNS TABLE (
  anomaly_type  text,
  count         bigint,
  sample_ids    uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Request aprovado sem certificado correspondente
  SELECT
    'request_approved_without_certificate'::text,
    COUNT(*)::bigint,
    array_agg(cr.id ORDER BY cr.processed_at DESC)
  FROM certificate_requests cr
  WHERE cr.status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM certificates c
      WHERE c.enrollment_id = cr.enrollment_id
        AND c.certificate_type = COALESCE(cr.certificate_type, 'technical')
    )

  UNION ALL

  -- Certificado com approval_status='approved' mas status != 'issued'
  SELECT
    'approved_certificate_not_issued'::text,
    COUNT(*)::bigint,
    array_agg(id ORDER BY updated_at DESC)
  FROM certificates
  WHERE approval_status = 'approved'
    AND status IS DISTINCT FROM 'issued'

  UNION ALL

  -- Certificado emitido sem issued_at
  SELECT
    'issued_certificate_without_issued_at'::text,
    COUNT(*)::bigint,
    array_agg(id ORDER BY created_at DESC)
  FROM certificates
  WHERE status = 'issued'
    AND issued_at IS NULL

  UNION ALL

  -- Certificado aprovado/rejeitado sem campo de auditoria
  SELECT
    'decision_without_audit_fields'::text,
    COUNT(*)::bigint,
    array_agg(id ORDER BY updated_at DESC)
  FROM certificates
  WHERE approval_status IN ('approved', 'rejected')
    AND (approved_at IS NULL OR approved_by IS NULL)

  UNION ALL

  -- Certificado com pdf_path mas sem pdf_sha256
  SELECT
    'pdf_without_sha256'::text,
    COUNT(*)::bigint,
    array_agg(id ORDER BY issued_at DESC)
  FROM certificates
  WHERE pdf_path IS NOT NULL
    AND pdf_sha256 IS NULL
$$;

-- Restringir a admins
REVOKE EXECUTE ON FUNCTION certificate_anomaly_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION certificate_anomaly_report() TO authenticated;

COMMENT ON FUNCTION certificate_anomaly_report IS
'Retorna contagem de anomalias no fluxo de certificados. '
'Chamar diariamente ou antes de auditorias. '
'Qualquer linha com count > 0 deve ser investigada.';
