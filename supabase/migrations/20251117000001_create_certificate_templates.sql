-- Migration: Create certificate templates system
-- Description: Allows admins to upload custom HTML templates for certificates

-- Create certificate_templates table
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('technical', 'lato-sensu', 'all')),
  html_content TEXT NOT NULL,
  css_content TEXT,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'certificate-templates',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_default_per_type UNIQUE NULLS NOT DISTINCT (certificate_type, is_default)
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for faster queries
CREATE INDEX idx_certificate_templates_type ON public.certificate_templates(certificate_type);
CREATE INDEX idx_certificate_templates_active ON public.certificate_templates(is_active);
CREATE INDEX idx_certificate_templates_default ON public.certificate_templates(certificate_type, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Policies for certificate_templates
CREATE POLICY "Admins can view all certificate templates"
  ON public.certificate_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can create certificate templates"
  ON public.certificate_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update certificate templates"
  ON public.certificate_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete certificate templates"
  ON public.certificate_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create storage bucket for certificate templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  false,
  5242880, -- 5MB limit
  ARRAY['text/html', 'text/css', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for certificate-templates bucket
CREATE POLICY "Admins can upload certificate templates"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'certificate-templates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view certificate templates"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificate-templates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can update certificate templates"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'certificate-templates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete certificate templates"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'certificate-templates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_certificate_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_certificate_template_timestamp
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_certificate_template_updated_at();

-- Function to ensure only one default template per type
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.certificate_templates
    SET is_default = false
    WHERE certificate_type = NEW.certificate_type
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single default
CREATE TRIGGER trigger_ensure_single_default
  BEFORE INSERT OR UPDATE ON public.certificate_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();

-- Comments
COMMENT ON TABLE public.certificate_templates IS 'Stores custom HTML/CSS templates for certificate generation';
COMMENT ON COLUMN public.certificate_templates.certificate_type IS 'Type of certificate this template is for: technical, lato-sensu, or all';
COMMENT ON COLUMN public.certificate_templates.html_content IS 'HTML template with placeholders like {{student_name}}, {{course_title}}, etc.';
COMMENT ON COLUMN public.certificate_templates.css_content IS 'Optional CSS styles for the template';
COMMENT ON COLUMN public.certificate_templates.is_default IS 'Whether this is the default template for the certificate type';
