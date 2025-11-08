-- ============================================================================
-- Adicionar suporte a tipos de certificado (Técnico e Lato Sensu)
-- ============================================================================

-- 1. Adicionar coluna certificate_type em certificate_requests
ALTER TABLE certificate_requests
ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'technical' CHECK (certificate_type IN ('technical', 'lato-sensu'));

-- 2. Adicionar coluna certificate_type em certificates
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'technical' CHECK (certificate_type IN ('technical', 'lato-sensu'));

-- 3. Remover constraint única de enrollment_id (para permitir múltiplos tipos)
ALTER TABLE certificate_requests
DROP CONSTRAINT IF EXISTS certificate_requests_enrollment_id_key;

-- 4. Adicionar constraint única composta (enrollment_id + certificate_type)
ALTER TABLE certificate_requests
ADD CONSTRAINT certificate_requests_enrollment_type_unique
UNIQUE (enrollment_id, certificate_type);

-- 5. Remover constraint única de enrollment_id em certificates
ALTER TABLE certificates
DROP CONSTRAINT IF EXISTS certificates_enrollment_id_key;

-- 6. Adicionar constraint única composta (enrollment_id + certificate_type)
ALTER TABLE certificates
ADD CONSTRAINT certificates_enrollment_type_unique
UNIQUE (enrollment_id, certificate_type);

-- 7. Comentários
COMMENT ON COLUMN certificate_requests.certificate_type IS
'Tipo de certificado: technical (técnico) ou lato-sensu (pós-graduação)';

COMMENT ON COLUMN certificates.certificate_type IS
'Tipo de certificado: technical (técnico) ou lato-sensu (pós-graduação)';
