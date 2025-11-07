-- Create table for Excel template management
-- Stores uploaded Excel templates with field mappings for report generation

CREATE TABLE IF NOT EXISTS public.excel_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'excel-templates',
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.excel_templates IS
  'Excel templates for generating customizable reports with field mappings';

COMMENT ON COLUMN public.excel_templates.name IS
  'User-friendly name for the template';

COMMENT ON COLUMN public.excel_templates.category IS
  'Report category: users, grades, enrollments, access, student-history';

COMMENT ON COLUMN public.excel_templates.storage_path IS
  'Path to the Excel file in Supabase Storage';

COMMENT ON COLUMN public.excel_templates.storage_bucket IS
  'Storage bucket name (default: excel-templates)';

COMMENT ON COLUMN public.excel_templates.metadata IS
  'JSON containing mappings (static cells and array fields) and analysis data';

COMMENT ON COLUMN public.excel_templates.is_active IS
  'Whether this template is active and can be used for report generation';

COMMENT ON COLUMN public.excel_templates.created_by IS
  'Reference to the user who created this template';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_excel_templates_category
  ON public.excel_templates(category);

CREATE INDEX IF NOT EXISTS idx_excel_templates_active
  ON public.excel_templates(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_excel_templates_created_by
  ON public.excel_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_excel_templates_created_at
  ON public.excel_templates(created_at DESC);

-- Unique constraint: prevent duplicate template names per category per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_excel_templates_unique_name
  ON public.excel_templates(name, category, created_by)
  WHERE is_active = true;

-- Add index comments
COMMENT ON INDEX public.idx_excel_templates_category IS
  'Optimize queries filtering by report category';

COMMENT ON INDEX public.idx_excel_templates_active IS
  'Optimize queries for active templates (partial index)';

COMMENT ON INDEX public.idx_excel_templates_created_by IS
  'Optimize queries filtering by creator';

COMMENT ON INDEX public.idx_excel_templates_unique_name IS
  'Ensure unique active template names per category per user';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_excel_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER excel_templates_updated_at
  BEFORE UPDATE ON public.excel_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_excel_templates_updated_at();

-- Enable Row Level Security
ALTER TABLE public.excel_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON public.excel_templates
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can create templates"
  ON public.excel_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.excel_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.excel_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Admins can view all templates
CREATE POLICY "Admins can view all templates"
  ON public.excel_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
  ON public.excel_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
