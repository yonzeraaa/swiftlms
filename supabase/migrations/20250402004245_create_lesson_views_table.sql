-- Migration: Create lesson_views table to track student progress

-- 1. Create the table
CREATE TABLE public.lesson_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    viewed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(), -- Keep created_at for consistency

    CONSTRAINT lesson_views_user_lesson_unique UNIQUE (user_id, lesson_id) -- Prevent duplicate views per user/lesson
);

-- 2. Add comments to the table and columns
COMMENT ON TABLE public.lesson_views IS 'Tracks when a user views a specific lesson, used for progress calculation.';
COMMENT ON COLUMN public.lesson_views.id IS 'Unique identifier for the view record.';
COMMENT ON COLUMN public.lesson_views.user_id IS 'Foreign key referencing the user who viewed the lesson.';
COMMENT ON COLUMN public.lesson_views.lesson_id IS 'Foreign key referencing the lesson that was viewed.';
COMMENT ON COLUMN public.lesson_views.viewed_at IS 'Timestamp when the lesson was marked as viewed (can be updated if re-viewed).';
COMMENT ON COLUMN public.lesson_views.created_at IS 'Timestamp when the view record was first created.';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can select their own lesson views
CREATE POLICY "Allow users to select their own lesson views"
ON public.lesson_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own lesson views
CREATE POLICY "Allow users to insert their own lesson views"
ON public.lesson_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Optional: Allow admins to view all lesson views (Uncomment if needed later)
/*
CREATE POLICY "Allow admins to select all lesson views"
ON public.lesson_views
FOR SELECT
USING (public.is_admin(auth.uid()));
*/

-- Optional: Allow users to update the viewed_at timestamp if they re-view (Uncomment if needed)
/*
CREATE POLICY "Allow users to update viewed_at for their own views"
ON public.lesson_views
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
*/

-- Grant usage permissions for the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_views TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE lesson_views_id_seq TO authenticated; -- Removed: Sequence does not exist for UUID PK

-- Grant usage permissions for the table to service_role (needed for Supabase internals/functions)
GRANT ALL ON TABLE public.lesson_views TO service_role;
-- GRANT ALL ON SEQUENCE lesson_views_id_seq TO service_role; -- Removed: Sequence does not exist for UUID PK

-- Note: Ensure the 'lessons' table exists before running this migration.
-- Note: Ensure the 'is_admin' function exists if uncommenting the admin policy.