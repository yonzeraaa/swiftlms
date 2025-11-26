-- Create table for tracking detailed import events
-- This provides granular event logging with references to specific items

CREATE TABLE IF NOT EXISTS public.drive_import_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.drive_import_jobs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.drive_import_items(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.drive_import_events IS
  'Detailed event log for import jobs with optional item references';

COMMENT ON COLUMN public.drive_import_events.job_id IS
  'Reference to the import job this event belongs to';

COMMENT ON COLUMN public.drive_import_events.item_id IS
  'Optional reference to specific item this event relates to';

COMMENT ON COLUMN public.drive_import_events.level IS
  'Event severity: info, warn, error';

COMMENT ON COLUMN public.drive_import_events.message IS
  'Human-readable event message';

COMMENT ON COLUMN public.drive_import_events.context IS
  'Additional structured data about the event';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_drive_import_events_job_id
  ON public.drive_import_events(job_id);

CREATE INDEX IF NOT EXISTS idx_drive_import_events_item_id
  ON public.drive_import_events(item_id)
  WHERE item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drive_import_events_level
  ON public.drive_import_events(level)
  WHERE level IN ('warn', 'error');

CREATE INDEX IF NOT EXISTS idx_drive_import_events_created_at
  ON public.drive_import_events(created_at DESC);

-- Add index comments
COMMENT ON INDEX public.idx_drive_import_events_job_id IS
  'Optimize queries filtering by job_id';

COMMENT ON INDEX public.idx_drive_import_events_item_id IS
  'Optimize queries filtering by item_id (partial index for non-null values)';

COMMENT ON INDEX public.idx_drive_import_events_level IS
  'Optimize queries for warnings and errors (partial index)';
