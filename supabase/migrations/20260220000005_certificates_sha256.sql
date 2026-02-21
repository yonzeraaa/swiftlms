-- ============================================================================
-- Integridade criptográfica do PDF do certificado
-- ============================================================================
-- Armazena o SHA-256 do arquivo PDF no momento da emissão.
-- O verificador público pode exibir o hash para que o destinatário
-- confirme a integridade do arquivo baixado.
-- ============================================================================

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS pdf_sha256 text;

COMMENT ON COLUMN certificates.pdf_sha256 IS
'SHA-256 hex do arquivo PDF calculado no momento da emissão. '
'Permite verificar que o arquivo não foi alterado após a emissão.';
