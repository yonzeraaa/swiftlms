-- Add cancellation support to drive_import_jobs table
-- This allows users to cancel in-progress imports and prevents infinite job execution

-- Add cancellation fields
ALTER TABLE public.drive_import_jobs
  ADD COLUMN IF NOT EXISTS cancellation_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.drive_import_jobs.cancellation_requested
  IS 'Flag set to true when user requests cancellation of the import job';

COMMENT ON COLUMN public.drive_import_jobs.cancelled_at
  IS 'Timestamp when the user requested cancellation';

-- Create index for efficient cancellation checks during import loops
-- This is critical for performance as we check this in every iteration
CREATE INDEX IF NOT EXISTS idx_drive_import_jobs_cancellation
  ON public.drive_import_jobs(id, cancellation_requested)
  WHERE cancellation_requested = true;

-- Add comment on index
COMMENT ON INDEX public.idx_drive_import_jobs_cancellation
  IS 'Optimizes cancellation checks during import processing loops';
