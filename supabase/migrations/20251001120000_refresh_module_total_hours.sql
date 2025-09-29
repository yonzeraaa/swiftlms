create or replace function public.refresh_module_total_hours(p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(coalesce(s.hours, 0)), 0)
  into v_total
  from public.module_subjects ms
  join public.subjects s on s.id = ms.subject_id
  where ms.module_id = p_module_id;

  update public.course_modules cm
  set total_hours = v_total,
      updated_at = now()
  where cm.id = p_module_id
    and cm.total_hours is distinct from v_total;
end;
$$;

create or replace function public.handle_module_subject_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_module_total_hours(old.module_id);
    return old;
  end if;

  perform public.refresh_module_total_hours(new.module_id);

  if tg_op = 'UPDATE' and new.module_id is distinct from old.module_id then
    perform public.refresh_module_total_hours(old.module_id);
  end if;

  return new;
end;
$$;

drop trigger if exists module_subjects_refresh_hours_ai on public.module_subjects;
create trigger module_subjects_refresh_hours_ai
  after insert on public.module_subjects
  for each row execute function public.handle_module_subject_change();

drop trigger if exists module_subjects_refresh_hours_au on public.module_subjects;
create trigger module_subjects_refresh_hours_au
  after update on public.module_subjects
  for each row execute function public.handle_module_subject_change();

drop trigger if exists module_subjects_refresh_hours_ad on public.module_subjects;
create trigger module_subjects_refresh_hours_ad
  after delete on public.module_subjects
  for each row execute function public.handle_module_subject_change();

create or replace function public.handle_subject_hours_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.hours is distinct from old.hours then
      for v_module_id in (
        select module_id
        from public.module_subjects
        where subject_id = new.id
      ) loop
        perform public.refresh_module_total_hours(v_module_id);
      end loop;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    for v_module_id in (
      select module_id
      from public.module_subjects
      where subject_id = old.id
    ) loop
      perform public.refresh_module_total_hours(v_module_id);
    end loop;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists subjects_refresh_module_hours on public.subjects;
create trigger subjects_refresh_module_hours
  after update on public.subjects
  for each row execute function public.handle_subject_hours_change();

drop trigger if exists subjects_refresh_module_hours_delete on public.subjects;
create trigger subjects_refresh_module_hours_delete
  after delete on public.subjects
  for each row execute function public.handle_subject_hours_change();

-- Backfill existing modules
select public.refresh_module_total_hours(id)
from public.course_modules;
