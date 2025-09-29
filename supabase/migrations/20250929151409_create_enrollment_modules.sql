create table if not exists public.enrollment_modules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists enrollment_modules_enrollment_module_key
  on public.enrollment_modules(enrollment_id, module_id);

create index if not exists enrollment_modules_module_id_idx
  on public.enrollment_modules(module_id);

-- Backfill existing enrollments with all modules from their course
insert into public.enrollment_modules (enrollment_id, module_id)
select e.id, m.id
from public.enrollments e
join public.course_modules m on m.course_id = e.course_id
on conflict (enrollment_id, module_id) do nothing;
