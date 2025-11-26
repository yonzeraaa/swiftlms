-- Create storage bucket for Excel templates if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-templates', 'excel-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS Policies for excel-templates bucket

-- Policy: Users can read their own template files
CREATE POLICY "Users can read own template files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'excel-templates'
    AND auth.uid() = (
      SELECT created_by
      FROM public.excel_templates
      WHERE storage_path = name
      LIMIT 1
    )
  );

-- Policy: Users can upload template files
CREATE POLICY "Users can upload template files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'excel-templates'
    AND auth.uid() IS NOT NULL
    -- Path must start with category folder
    AND name ~ '^(users|grades|enrollments|access|student-history)/'
  );

-- Policy: Users can update their own template files
CREATE POLICY "Users can update own template files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'excel-templates'
    AND auth.uid() = (
      SELECT created_by
      FROM public.excel_templates
      WHERE storage_path = name
      LIMIT 1
    )
  );

-- Policy: Users can delete their own template files
CREATE POLICY "Users can delete own template files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'excel-templates'
    AND auth.uid() = (
      SELECT created_by
      FROM public.excel_templates
      WHERE storage_path = name
      LIMIT 1
    )
  );

-- Policy: Admins can access all template files
CREATE POLICY "Admins can access all template files"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'excel-templates'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can read own template files" ON storage.objects IS
  'Allow users to download their own template files';

COMMENT ON POLICY "Users can upload template files" ON storage.objects IS
  'Allow authenticated users to upload templates to category folders';

COMMENT ON POLICY "Admins can access all template files" ON storage.objects IS
  'Grant full access to admin users for all template files';
