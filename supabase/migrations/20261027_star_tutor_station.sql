-- Tutors claim STAR students after check-in. Students no longer pick a teacher.

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
  if p_teacher_id is null then
    raise exception 'TEACHER_REQUIRED';
  end if;
  select * into v_teacher from private.staff_directory d where d.id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.checked_in_at), '[]'::jsonb)
  into v_waiting
  from (
    select s.id, s.student_id, s.student_name, s.grade, s.subject, s.checked_in_at,
           s.teacher_id, s.teacher_name, s.needs_bus
    from private.kiosk_sessions s
    where s.program = 'star'
      and s.checked_out_at is null
      and s.teacher_id is null
    order by s.checked_in_at
  ) x;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.checked_in_at), '[]'::jsonb)
  into v_mine
  from (
    select s.id, s.student_id, s.student_name, s.grade, s.subject, s.checked_in_at,
           s.teacher_id, s.teacher_name, s.needs_bus
    from private.kiosk_sessions s
    where s.program = 'star'
      and s.checked_out_at is null
      and s.teacher_id = p_teacher_id
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
    'mine', coalesce(v_mine, '[]'::jsonb)
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
  if p_session_id is null or p_teacher_id is null then
    raise exception 'CLAIM_REQUIRED';
  end if;
  select * into v_teacher from private.staff_directory d where d.id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  select * into v_row
  from private.kiosk_sessions s
  where s.id = p_session_id
    and s.program = 'star'
    and s.checked_out_at is null
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

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'student_name', v_row.student_name,
    'teacher_name', v_row.teacher_name
  );
end;
$fn$;

create or replace function private.kiosk_tutor_release(p_session_id uuid, p_teacher_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'private'
as $fn$
declare
  v_row private.kiosk_sessions%rowtype;
begin
  if p_session_id is null or p_teacher_id is null then
    raise exception 'RELEASE_REQUIRED';
  end if;

  select * into v_row
  from private.kiosk_sessions s
  where s.id = p_session_id
    and s.program = 'star'
    and s.checked_out_at is null
  for update;
  if not found then raise exception 'SESSION_NOT_OPEN'; end if;
  if v_row.teacher_id is distinct from p_teacher_id then
    raise exception 'NOT_YOUR_STUDENT';
  end if;

  update private.kiosk_sessions
  set teacher_id = null,
      teacher_name = '',
      teacher_role = '',
      teacher_room = ''
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'student_name', v_row.student_name);
end;
$fn$;

create or replace function public.kiosk_tutor_floor(p_teacher_id bigint)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'private'
as $$ select private.kiosk_tutor_floor(p_teacher_id); $$;

create or replace function public.kiosk_tutor_claim(p_session_id uuid, p_teacher_id bigint)
returns jsonb
language sql
security definer
set search_path to 'public', 'private'
as $$ select private.kiosk_tutor_claim(p_session_id, p_teacher_id); $$;

create or replace function public.kiosk_tutor_release(p_session_id uuid, p_teacher_id bigint)
returns jsonb
language sql
security definer
set search_path to 'public', 'private'
as $$ select private.kiosk_tutor_release(p_session_id, p_teacher_id); $$;

revoke all on function private.kiosk_tutor_floor(bigint) from public, anon, authenticated;
revoke all on function private.kiosk_tutor_claim(uuid, bigint) from public, anon, authenticated;
revoke all on function private.kiosk_tutor_release(uuid, bigint) from public, anon, authenticated;
grant execute on function public.kiosk_tutor_floor(bigint) to anon, authenticated, service_role;
grant execute on function public.kiosk_tutor_claim(uuid, bigint) to anon, authenticated, service_role;
grant execute on function public.kiosk_tutor_release(uuid, bigint) to anon, authenticated, service_role;
