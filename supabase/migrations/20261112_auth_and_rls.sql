-- Staff sign-in audit trail and a hard email-domain gate.
-- Does not replace public.admin_replace_test_assignments.
-- That function already writes private.test_assignments and is service_role only.
-- Student tables already live in the private schema with RLS on and no anon policies.

-- Re-assert RLS on every application table. No new public grants.
do $$
declare
  rec record;
begin
  for rec in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname in ('public', 'private')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      rec.schema_name,
      rec.table_name
    );
  end loop;
end $$;

create table if not exists private.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text not null,
  action text not null,
  target text not null,
  row_count integer,
  success boolean not null default true,
  detail text
);

alter table private.audit_log enable row level security;

revoke all on table private.audit_log from public, anon, authenticated;

comment on table private.audit_log is
  'Who changed student or staff data, and when. Written by service_role after a verified staff session.';

-- Exact domain match. user@browardschools.com.evil is rejected.
create or replace function private.is_district_email(p_email text)
returns boolean
language sql
immutable
as $$
  select lower(split_part(coalesce(p_email, ''), '@', 2)) = 'browardschools.com'
    and length(split_part(coalesce(p_email, ''), '@', 1)) > 0
    and split_part(coalesce(p_email, ''), '@', 1) not like '%@%';
$$;

revoke all on function private.is_district_email(text) from public, anon, authenticated;

-- Blocks a new Auth user unless the address is a Broward Schools email.
-- Enable it in Authentication → Hooks → Before user created:
--   pg-functions://postgres/private/restrict_staff_signup
create or replace function private.restrict_staff_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = private
as $$
declare
  email text := lower(coalesce(event->'user'->>'email', ''));
begin
  if not private.is_district_email(email) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Sign-in is limited to @browardschools.com addresses.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on function private.restrict_staff_signup(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.restrict_staff_signup(jsonb) to supabase_auth_admin;

create or replace function public.admin_record_audit(
  p_actor_id uuid,
  p_actor_email text,
  p_action text,
  p_target text,
  p_row_count integer,
  p_success boolean,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = private
as $$
begin
  if not private.is_district_email(p_actor_email) then
    raise exception 'Audit actor must be a @browardschools.com address';
  end if;

  insert into private.audit_log (
    actor_id, actor_email, action, target, row_count, success, detail
  )
  values (
    p_actor_id,
    lower(p_actor_email),
    p_action,
    p_target,
    p_row_count,
    coalesce(p_success, true),
    p_detail
  );
end;
$$;

revoke all on function public.admin_record_audit(uuid, text, text, text, integer, boolean, text)
  from public, anon, authenticated;
grant execute on function public.admin_record_audit(uuid, text, text, text, integer, boolean, text)
  to service_role;

comment on function public.admin_record_audit(uuid, text, text, text, integer, boolean, text) is
  'Service role only. Records a staff change in private.audit_log.';
