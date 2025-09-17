-- Create tables to track Google Drive import jobs and logs
create table if not exists public.drive_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete cascade,
  folder_id text not null,
  status text not null default 'queued',
  total_items integer default 0,
  processed_items integer default 0,
  current_step text,
  error text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists drive_import_jobs_course_idx on public.drive_import_jobs(course_id);
create index if not exists drive_import_jobs_user_idx on public.drive_import_jobs(user_id);

create table if not exists public.drive_import_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.drive_import_jobs(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  context jsonb,
  created_at timestamptz default now()
);

create index if not exists drive_import_logs_job_idx on public.drive_import_logs(job_id);
create index if not exists drive_import_logs_level_idx on public.drive_import_logs(level);

create or replace function public.update_drive_import_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists drive_import_jobs_updated_at on public.drive_import_jobs;
create trigger drive_import_jobs_updated_at
before update on public.drive_import_jobs
for each row execute function public.update_drive_import_jobs_updated_at();
