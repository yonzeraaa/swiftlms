-- ============================================================================
-- Adicionar suporte para upload de certificados em DOCX
-- ============================================================================

-- 1. Adicionar colunas para armazenar arquivos de certificado
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS file_path text,
ADD COLUMN IF NOT EXISTS file_type text CHECK (file_type IN ('docx', 'pdf', 'generated')),
ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'certificates';

-- 2. Comentários
COMMENT ON COLUMN certificates.file_path IS
'Caminho do arquivo de certificado no storage (DOCX ou PDF)';

COMMENT ON COLUMN certificates.file_type IS
'Tipo do arquivo: docx (upload manual), pdf (convertido), generated (gerado via template)';

COMMENT ON COLUMN certificates.storage_bucket IS
'Bucket do Supabase Storage onde o arquivo está armazenado';

-- 3. Índice para buscar certificados por tipo de arquivo
CREATE INDEX IF NOT EXISTS idx_certificates_file_type
ON certificates(file_type)
WHERE file_path IS NOT NULL;
