-- ============================================================================
-- Invariantes do modelo de estado de certificados
-- ============================================================================
-- Objetivo: fechar no banco as combinações de estado que são estruturalmente
-- impossíveis, e sincronizar status↔approval_status via trigger para que
-- qualquer caminho de escrita produza estado consistente.
-- ============================================================================


-- 1. Trigger de sincronização de estado
-- ============================================================================
-- Por que trigger e não só CHECK: o trigger resolve a inconsistência antes que
-- o CHECK a detecte — qualquer write path que defina um campo sem o outro
-- fica correto automaticamente.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_certificate_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Aprovado → status deve ser 'issued'
  IF NEW.approval_status = 'approved' AND NEW.status IS DISTINCT FROM 'issued' THEN
    NEW.status := 'issued';
    -- Garantir issued_at preenchido
    IF NEW.issued_at IS NULL THEN
      NEW.issued_at := now();
    END IF;
  END IF;

  -- status='issued' → approval_status deve ser 'approved'
  IF NEW.status = 'issued' AND NEW.approval_status IS DISTINCT FROM 'approved' THEN
    NEW.approval_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_certificate_state ON certificates;
CREATE TRIGGER trigger_sync_certificate_state
  BEFORE INSERT OR UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION sync_certificate_state();


-- 2. CHECK: status e approval_status devem ser mutuamente consistentes
-- ============================================================================
-- Após o trigger, estas combinações são impossíveis:
--   issued + qualquer_coisa_diferente_de_approved
--   approved + qualquer_coisa_diferente_de_issued
-- ============================================================================

ALTER TABLE certificates
  DROP CONSTRAINT IF EXISTS chk_status_approval_consistent;

ALTER TABLE certificates
  ADD CONSTRAINT chk_status_approval_consistent CHECK (
    NOT (status = 'issued'         AND approval_status IS DISTINCT FROM 'approved')
    AND
    NOT (approval_status = 'approved' AND status IS DISTINCT FROM 'issued')
  );


-- 3. CHECK: campos de auditoria obrigatórios quando aprovado ou rejeitado
-- ============================================================================

ALTER TABLE certificates
  DROP CONSTRAINT IF EXISTS chk_audit_fields_on_decision;

ALTER TABLE certificates
  ADD CONSTRAINT chk_audit_fields_on_decision CHECK (
    NOT (
      approval_status IN ('approved', 'rejected')
      AND (approved_at IS NULL OR approved_by IS NULL)
    )
  );


-- 4. CHECK: motivo de rejeição obrigatório quando rejeitado
-- ============================================================================

ALTER TABLE certificates
  DROP CONSTRAINT IF EXISTS chk_rejection_reason_required;

ALTER TABLE certificates
  ADD CONSTRAINT chk_rejection_reason_required CHECK (
    NOT (approval_status = 'rejected' AND rejection_reason IS NULL)
  );


-- Comentários para futuros mantenedores
COMMENT ON CONSTRAINT chk_status_approval_consistent ON certificates IS
'issued↔approved devem sempre aparecer juntos. O trigger sync_certificate_state garante isso automaticamente.';

COMMENT ON CONSTRAINT chk_audit_fields_on_decision ON certificates IS
'approved_at e approved_by são obrigatórios quando o certificado foi aprovado ou rejeitado.';

COMMENT ON CONSTRAINT chk_rejection_reason_required ON certificates IS
'rejection_reason é obrigatório quando approval_status=rejected.';
