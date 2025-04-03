-- Migration: Change lessons.video_url to text array and migrate data

-- 1. Add the new array column temporarily allowing nulls
ALTER TABLE public.lessons
ADD COLUMN video_urls text[] NULL;

-- 2. Migrate data from the old column to the new array column
-- Wrap existing non-null URLs into a single-element array
UPDATE public.lessons
SET video_urls = ARRAY[video_url]
WHERE video_url IS NOT NULL AND video_url != ''; -- Only migrate non-empty URLs

-- 3. Drop the old video_url column
ALTER TABLE public.lessons
DROP COLUMN IF EXISTS video_url;

-- 4. (Optional but recommended) Add comments to the new column
COMMENT ON COLUMN public.lessons.video_urls IS 'Array of URLs for lesson videos or documents (PDFs, etc.).';

-- Note: No changes needed for triggers as they don't depend on this column's type.
-- RLS policies also likely don't depend on this specific column.