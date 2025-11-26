-- Create table for tracking individual import items
-- This allows granular tracking of each file/folder processed from Google Drive

CREATE TABLE IF NOT EXISTS public.drive_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.drive_import_jobs(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  kind TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  item_type TEXT, -- 'module' | 'subject' | 'lesson' | 'test'
  processed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB,
  storage_path TEXT,
  storage_public_url TEXT,
  attempt_count INTEGER DEFAULT 0,
  web_content_link TEXT,
  web_view_link TEXT,
  storage_bucket TEXT,
  storage_content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.drive_import_items IS
  'Tracks individual files and folders processed during Google Drive imports';

COMMENT ON COLUMN public.drive_import_items.job_id IS
  'Reference to the import job this item belongs to';

COMMENT ON COLUMN public.drive_import_items.drive_file_id IS
  'Google Drive file/folder ID';

COMMENT ON COLUMN public.drive_import_items.status IS
  'Item processing status: pending, processing, completed, failed, skipped';

COMMENT ON COLUMN public.drive_import_items.item_type IS
  'Type of educational content: module, subject, lesson, or test';

COMMENT ON COLUMN public.drive_import_items.processed_at IS
  'Timestamp when item processing completed successfully';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_drive_import_items_job_id
  ON public.drive_import_items(job_id);

CREATE INDEX IF NOT EXISTS idx_drive_import_items_status
  ON public.drive_import_items(status)
  WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_drive_import_items_drive_file_id
  ON public.drive_import_items(drive_file_id);

CREATE INDEX IF NOT EXISTS idx_drive_import_items_item_type
  ON public.drive_import_items(item_type);

-- Add index comments
COMMENT ON INDEX public.idx_drive_import_items_job_id IS
  'Optimize queries filtering by job_id';

COMMENT ON INDEX public.idx_drive_import_items_status IS
  'Optimize queries for non-completed items (partial index)';

COMMENT ON INDEX public.idx_drive_import_items_drive_file_id IS
  'Optimize lookups by Google Drive file ID';
