-- Refatora as tabelas de importação para suportar múltiplos provedores (Google Drive e OneDrive)

-- Renomear tabelas somente se ainda não foram migradas
do $$
begin
  if to_regclass('public.file_import_jobs') is null and to_regclass('public.drive_import_jobs') is not null then
    alter table public.drive_import_jobs rename to file_import_jobs;
  end if;
end $$;

do $$
begin
  if to_regclass('public.file_import_logs') is null and to_regclass('public.drive_import_logs') is not null then
    alter table public.drive_import_logs rename to file_import_logs;
  end if;
end $$;

do $$
begin
  if to_regclass('public.file_import_items') is null and to_regclass('public.drive_import_items') is not null then
    alter table public.drive_import_items rename to file_import_items;
  end if;
end $$;

do $$
begin
  if to_regclass('public.file_import_events') is null and to_regclass('public.drive_import_events') is not null then
    alter table public.drive_import_events rename to file_import_events;
  end if;
end $$;

-- Renomear índices/constraints existentes
alter index if exists drive_import_jobs_course_idx rename to file_import_jobs_course_idx;
alter index if exists drive_import_jobs_user_idx rename to file_import_jobs_user_idx;
alter index if exists drive_import_logs_job_idx rename to file_import_logs_job_idx;
alter index if exists drive_import_logs_level_idx rename to file_import_logs_level_idx;

do $$
begin
  if to_regclass('public.file_import_jobs') is not null then
    begin
      alter table public.file_import_jobs rename constraint drive_import_jobs_course_id_fkey to file_import_jobs_course_id_fkey;
    exception
      when undefined_object then null;
    end;
    begin
      alter table public.file_import_jobs rename constraint drive_import_jobs_user_id_fkey to file_import_jobs_user_id_fkey;
    exception
      when undefined_object then null;
    end;
  end if;

  if to_regclass('public.file_import_logs') is not null then
    begin
      alter table public.file_import_logs rename constraint drive_import_logs_job_id_fkey to file_import_logs_job_id_fkey;
    exception
      when undefined_object then null;
    end;
  end if;

  if to_regclass('public.file_import_items') is not null then
    begin
      alter table public.file_import_items rename constraint drive_import_items_job_id_fkey to file_import_items_job_id_fkey;
    exception
      when undefined_object then null;
    end;
  end if;

  if to_regclass('public.file_import_events') is not null then
    begin
      alter table public.file_import_events rename constraint drive_import_events_item_id_fkey to file_import_events_item_id_fkey;
    exception
      when undefined_object then null;
    end;
    begin
      alter table public.file_import_events rename constraint drive_import_events_job_id_fkey to file_import_events_job_id_fkey;
    exception
      when undefined_object then null;
    end;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'drive_import_jobs_updated_at'
  ) then
    alter trigger drive_import_jobs_updated_at on public.file_import_jobs rename to file_import_jobs_updated_at;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'update_drive_import_jobs_updated_at'
      and pg_function_is_visible(oid)
  ) then
    alter function public.update_drive_import_jobs_updated_at() rename to update_file_import_jobs_updated_at;
  end if;
end $$;

-- Garantir que a função atualize o campo updated_at corretamente
create or replace function public.update_file_import_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists file_import_jobs_updated_at on public.file_import_jobs;
create trigger file_import_jobs_updated_at
before update on public.file_import_jobs
for each row execute function public.update_file_import_jobs_updated_at();

-- Renomear coluna folder_id para um identificador genérico
do $$
begin
  if to_regclass('public.file_import_jobs') is not null and
     exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'file_import_jobs'
         and column_name = 'folder_id'
     ) then
    alter table public.file_import_jobs rename column folder_id to source_identifier;
  end if;
end $$;

-- Ajustar schema dos jobs
alter table if exists public.file_import_jobs
  add column if not exists provider text not null default 'google',
  add column if not exists source_type text,
  add column if not exists source_metadata jsonb default '{}'::jsonb;

-- Ajustar schema dos itens importados
alter table if exists public.file_import_items
  add column if not exists provider text not null default 'google',
  add column if not exists download_checkpoint jsonb,
  add column if not exists storage_upload_id text,
  add column if not exists storage_uploaded_parts integer default 0;

-- Ajustar schema de logs e eventos
alter table if exists public.file_import_logs
  add column if not exists provider text not null default 'google';

alter table if exists public.file_import_events
  add column if not exists provider text not null default 'google';

-- Atualizar dados existentes
update public.file_import_jobs set provider = 'google' where provider is null;
update public.file_import_logs set provider = 'google' where provider is null;
update public.file_import_events set provider = 'google' where provider is null;
update public.file_import_items set provider = 'google' where provider is null;
