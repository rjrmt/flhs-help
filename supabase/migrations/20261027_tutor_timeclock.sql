-- Tutor clock-in / clock-out and students-helped log.

create table if not exists private.kiosk_tutor_shifts (
  id uuid primary key default gen_random_uuid(),
  teacher_id bigint not null,
  teacher_name text not null default '',
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz
);

create unique index if not exists kiosk_tutor_shifts_open_idx
  on private.kiosk_tutor_shifts (teacher_id)
  where clocked_out_at is null;

create index if not exists kiosk_tutor_shifts_teacher_idx
  on private.kiosk_tutor_shifts (teacher_id, clocked_in_at desc);

create table if not exists private.kiosk_tutor_helps (
  id uuid primary key default gen_random_uuid(),
  teacher_id bigint not null,
  session_id uuid,
  student_id text not null default '',
  student_name text not null default '',
  helped_at timestamptz not null default now()
);

create unique index if not exists kiosk_tutor_helps_once
  on private.kiosk_tutor_helps (teacher_id, session_id)
  where session_id is not null;

create index if not exists kiosk_tutor_helps_teacher_idx
  on private.kiosk_tutor_helps (teacher_id, helped_at desc);

create or replace function private.kiosk_overlap_seconds(
  p_start timestamptz,
  p_end timestamptz,
  p_from timestamptz,
  p_until timestamptz
) returns numeric
language sql
immutable
as $$
  select greatest(
    0::numeric,
    extract(epoch from (least(p_until, p_end) - greatest(p_from, p_start)))
  );
$$;

create or replace function private.kiosk_tutor_hours(
  p_teacher_id bigint,
  p_from timestamptz,
  p_until timestamptz
) returns numeric
language sql
stable
security definer
set search_path to 'private'
as $$
  select coalesce(sum(
    private.kiosk_overlap_seconds(
      s.clocked_in_at,
      coalesce(s.clocked_out_at, now()),
      p_from,
      p_until
    )
  ), 0)
  from private.kiosk_tutor_shifts s
  where s.teacher_id = p_teacher_id
    and s.clocked_in_at < p_until
    and coalesce(s.clocked_out_at, now()) > p_from;
$$;

create or replace function private.kiosk_tutor_punch_payload(p_teacher_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'private'
as $fn$
declare
  v_now_et timestamp := timezone('America/New_York', now());
  v_today date := v_now_et::date;
  v_week date := date_trunc('week', v_now_et)::date;
  v_today_start timestamptz := v_today::timestamp AT TIME ZONE 'America/New_York';
  v_week_start timestamptz := v_week::timestamp AT TIME ZONE 'America/New_York';
  v_open private.kiosk_tutor_shifts%rowtype;
  v_shifts jsonb;
begin
  select * into v_open
  from private.kiosk_tutor_shifts s
  where s.teacher_id = p_teacher_id and s.clocked_out_at is null
  order by s.clocked_in_at desc
  limit 1;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.clocked_in_at desc), '[]'::jsonb)
  into v_shifts
  from (
    select s.id, s.clocked_in_at, s.clocked_out_at
    from private.kiosk_tutor_shifts s
    where s.teacher_id = p_teacher_id
    order by s.clocked_in_at desc
    limit 12
  ) x;

  return jsonb_build_object(
    'open', v_open.id is not null,
    'clocked_in_at', v_open.clocked_in_at,
    'hours_today', private.kiosk_tutor_hours(p_teacher_id, v_today_start, v_today_start + interval '1 day'),
    'hours_week', private.kiosk_tutor_hours(p_teacher_id, v_week_start, v_today_start + interval '1 day'),
    'students_today', (
      select count(*) from private.kiosk_tutor_helps h
      where h.teacher_id = p_teacher_id
        and timezone('America/New_York', h.helped_at)::date = v_today
    ),
    'students_week', (
      select count(*) from private.kiosk_tutor_helps h
      where h.teacher_id = p_teacher_id
        and timezone('America/New_York', h.helped_at)::date >= v_week
    ),
    'students_all', (
      select count(*) from private.kiosk_tutor_helps h
      where h.teacher_id = p_teacher_id
    ),
    'shifts', coalesce(v_shifts, '[]'::jsonb)
  );
end;
$fn$;

create or replace function private.kiosk_tutor_clock(p_teacher_id bigint, p_action text)
returns jsonb
language plpgsql
security definer
set search_path to 'private'
as $fn$
declare
  v_teacher private.staff_directory%rowtype;
  v_open private.kiosk_tutor_shifts%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
begin
  if p_teacher_id is null then raise exception 'TEACHER_REQUIRED'; end if;
  select * into v_teacher from private.staff_directory d where d.id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  select * into v_open
  from private.kiosk_tutor_shifts s
  where s.teacher_id = p_teacher_id and s.clocked_out_at is null
  for update;

  if v_action = 'in' then
    if v_open.id is not null then
      return jsonb_build_object('ok', true, 'already', true) || private.kiosk_tutor_punch_payload(p_teacher_id);
    end if;
    insert into private.kiosk_tutor_shifts (teacher_id, teacher_name)
    values (v_teacher.id, coalesce(v_teacher.name, ''));
    return jsonb_build_object('ok', true, 'action', 'in') || private.kiosk_tutor_punch_payload(p_teacher_id);
  end if;

  if v_action = 'out' then
    if v_open.id is null then raise exception 'NOT_CLOCKED_IN'; end if;
    update private.kiosk_tutor_shifts
    set clocked_out_at = now()
    where id = v_open.id;
    return jsonb_build_object('ok', true, 'action', 'out') || private.kiosk_tutor_punch_payload(p_teacher_id);
  end if;

  raise exception 'INVALID_PUNCH';
end;
$fn$;

create or replace function private.kiosk_tutor_floor(p_teacher_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'private'
as $fn$
declare
  v_teacher private.staff_directory%rowtype;
  v_waiting jsonb;
  v_mine jsonb;
begin
  if p_teacher_id is null then raise exception 'TEACHER_REQUIRED'; end if;
  select * into v_teacher from private.staff_directory d where d.id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.checked_in_at), '[]'::jsonb)
  into v_waiting
  from (
    select s.id, s.student_id, s.student_name, s.grade, s.subject, s.checked_in_at,
           s.teacher_id, s.teacher_name, s.needs_bus
    from private.kiosk_sessions s
    where s.program = 'star' and s.checked_out_at is null and s.teacher_id is null
    order by s.checked_in_at
  ) x;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.checked_in_at), '[]'::jsonb)
  into v_mine
  from (
    select s.id, s.student_id, s.student_name, s.grade, s.subject, s.checked_in_at,
           s.teacher_id, s.teacher_name, s.needs_bus
    from private.kiosk_sessions s
    where s.program = 'star' and s.checked_out_at is null and s.teacher_id = p_teacher_id
    order by s.checked_in_at
  ) x;

  return jsonb_build_object(
    'teacher', jsonb_build_object(
      'id', v_teacher.id,
      'name', v_teacher.name,
      'role', coalesce(v_teacher.role, ''),
      'room', coalesce(v_teacher.room, '')
    ),
    'waiting', coalesce(v_waiting, '[]'::jsonb),
    'mine', coalesce(v_mine, '[]'::jsonb),
    'punch', private.kiosk_tutor_punch_payload(p_teacher_id)
  );
end;
$fn$;

create or replace function private.kiosk_tutor_claim(p_session_id uuid, p_teacher_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'private'
as $fn$
declare
  v_teacher private.staff_directory%rowtype;
  v_row private.kiosk_sessions%rowtype;
begin
  if p_session_id is null or p_teacher_id is null then raise exception 'CLAIM_REQUIRED'; end if;
  select * into v_teacher from private.staff_directory d where d.id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  select * into v_row
  from private.kiosk_sessions s
  where s.id = p_session_id and s.program = 'star' and s.checked_out_at is null
  for update;
  if not found then raise exception 'SESSION_NOT_OPEN'; end if;
  if v_row.teacher_id is not null and v_row.teacher_id <> p_teacher_id then
    raise exception 'ALREADY_ASSIGNED';
  end if;

  update private.kiosk_sessions
  set teacher_id = v_teacher.id,
      teacher_name = coalesce(v_teacher.name, ''),
      teacher_role = coalesce(v_teacher.role, ''),
      teacher_room = coalesce(v_teacher.room, '')
  where id = v_row.id
  returning * into v_row;

  insert into private.kiosk_tutor_helps (teacher_id, session_id, student_id, student_name)
  values (v_teacher.id, v_row.id, v_row.student_id, v_row.student_name)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'student_name', v_row.student_name,
    'teacher_name', v_row.teacher_name
  );
end;
$fn$;

create or replace function public.kiosk_tutor_clock(p_teacher_id bigint, p_action text)
returns jsonb
language sql
security definer
set search_path to 'public', 'private'
as $$ select private.kiosk_tutor_clock(p_teacher_id, p_action); $$;

revoke all on function private.kiosk_tutor_clock(bigint, text) from public, anon, authenticated;
revoke all on function private.kiosk_tutor_hours(bigint, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.kiosk_tutor_punch_payload(bigint) from public, anon, authenticated;
grant execute on function public.kiosk_tutor_clock(bigint, text) to anon, authenticated, service_role;
