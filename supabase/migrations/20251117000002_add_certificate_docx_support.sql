-- Adiciona suporte para templates DOCX de certificados
-- Modifica a tabela excel_templates para incluir tipos de certificados DOCX

-- Adicionar tipo certificate-docx às categorias existentes
-- A tabela excel_templates já existe e armazena category, vamos adicionar metadados específicos

-- Adicionar coluna para tipo de certificado (técnico/lato-sensu) quando category = 'certificate-docx'
ALTER TABLE excel_templates
ADD COLUMN IF NOT EXISTS certificate_kind TEXT CHECK (certificate_kind IN ('technical', 'lato-sensu', 'all'));

-- Adicionar coluna para armazenar placeholders extraídos do DOCX
ALTER TABLE excel_templates
ADD COLUMN IF NOT EXISTS placeholders JSONB DEFAULT '[]'::jsonb;

-- Adicionar coluna para warnings de validação
ALTER TABLE excel_templates
ADD COLUMN IF NOT EXISTS validation_warnings TEXT[];

-- Adicionar índice para busca rápida por tipo de certificado
CREATE INDEX IF NOT EXISTS idx_excel_templates_certificate_kind
ON excel_templates(certificate_kind)
WHERE category = 'certificate-docx';

-- Comentários nas colunas
COMMENT ON COLUMN excel_templates.certificate_kind IS 'Tipo de certificado: technical, lato-sensu ou all. Usado quando category = certificate-docx';
COMMENT ON COLUMN excel_templates.placeholders IS 'Array de placeholders extraídos do template DOCX com seus mapeamentos';
COMMENT ON COLUMN excel_templates.validation_warnings IS 'Avisos de validação durante o processamento do template';
