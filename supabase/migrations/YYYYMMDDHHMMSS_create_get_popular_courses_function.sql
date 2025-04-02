-- Function to get popular courses based on enrollment count
create or replace function public.get_popular_courses (limit_count int default 5)
returns table (
    course_id uuid,
    title text,
    enrollment_count bigint
)
language sql
stable -- Indicates the function doesn't modify the database
as $$
  select
    c.id as course_id,
    c.title,
    count(e.id)::bigint as enrollment_count -- Cast count to bigint to match potential return type expectation
  from
    public.courses c
  join
    public.enrollments e on c.id = e.course_id
  group by
    c.id, c.title
  order by
    enrollment_count desc
  limit limit_count;
$$;

-- Optional: Grant execute permission to the authenticated role
-- grant execute on function public.get_popular_courses(int) to authenticated;
-- grant execute on function public.get_popular_courses(int) to service_role; -- Ensure service_role can also call if needed

-- Note: Adjust permissions (authenticated, anon, service_role) as needed for your security model.
-- The frontend likely calls this as an authenticated user.