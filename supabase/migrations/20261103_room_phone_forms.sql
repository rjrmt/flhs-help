-- Teachers confirm the room and room phone on file.
-- Submissions stay in this table until IT applies a correction to staff_directory.

create table if not exists private.room_phone_forms (
  id uuid primary key default gen_random_uuid(),
  staff_id bigint not null unique references private.staff_directory (id) on delete cascade,
  staff_name text not null,
  role text not null default '',
  room_on_file text not null default '',
  phone_on_file text not null default '',
  room_confirmed boolean not null,
  phone_confirmed boolean not null,
  reported_room text not null default '',
  reported_phone text not null default '',
  notes text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_phone_forms_room_len check (char_length(reported_room) <= 40),
  constraint room_phone_forms_phone_len check (char_length(reported_phone) <= 40),
  constraint room_phone_forms_notes_len check (char_length(notes) <= 500),
  constraint room_phone_forms_name_len check (char_length(staff_name) <= 200)
);

alter table private.room_phone_forms enable row level security;

revoke all on table private.room_phone_forms from public, anon, authenticated;

create or replace function private.normalize_room_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path to 'private', 'public'
as $$
declare
  raw text := btrim(coalesce(p_raw, ''));
  digits text;
begin
  if raw = '' then
    return '';
  end if;
  if raw ~* '^radio$' then
    return 'Radio';
  end if;
  if raw ~* '^(none|n/?a|no phone|unknown|-)$' then
    return '';
  end if;
  digits := regexp_replace(raw, '\D', '', 'g');
  if length(digits) = 11 and left(digits, 1) = '1' then
    digits := substring(digits from 2);
  end if;
  if length(digits) = 10 and left(digits, 3) = '754' then
    digits := substring(digits from 4);
  end if;
  if length(digits) = 7 then
    return substring(digits from 1 for 3) || '-' || substring(digits from 4);
  end if;
  if length(digits) = 10 then
    return substring(digits from 1 for 3) || '-' || substring(digits from 4 for 3) || '-' || substring(digits from 7);
  end if;
  raise exception 'Enter a room phone like 754-322-1100, or Radio';
end;
$$;

revoke all on function private.normalize_room_phone(text) from public, anon, authenticated;

create or replace function public.list_room_phone_staff()
returns jsonb
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'role', coalesce(d.role, ''),
        'room', coalesce(d.room, '')
      )
      order by lower(d.name)
    ),
    '[]'::jsonb
  )
  from private.staff_directory d
  where coalesce(btrim(d.name), '') <> '';
$$;

create or replace function public.preview_room_phone(p_staff_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'private', 'public'
as $$
declare
  out_row jsonb;
begin
  if p_staff_id is null then
    raise exception 'Pick your name from the staff list';
  end if;

  select jsonb_build_object(
    'id', d.id,
    'name', d.name,
    'role', coalesce(d.role, ''),
    'room', coalesce(d.room, ''),
    'main_phone', coalesce(d.main_phone, '')
  )
  into out_row
  from private.staff_directory d
  where d.id = p_staff_id
    and coalesce(btrim(d.name), '') <> '';

  if out_row is null then
    raise exception 'That staff name is not in the directory';
  end if;

  return out_row;
end;
$$;

create or replace function public.submit_room_phone(
  p_staff_id bigint,
  p_room_confirmed boolean,
  p_phone_confirmed boolean,
  p_reported_room text default '',
  p_reported_phone text default '',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_name text;
  v_role text;
  v_room text;
  v_phone text;
  v_phone_norm text;
  v_reported_room text := btrim(coalesce(p_reported_room, ''));
  v_reported_phone text := '';
  v_room_confirmed boolean := false;
  v_phone_confirmed boolean := false;
  v_notes text := btrim(coalesce(p_notes, ''));
  out_row jsonb;
begin
  if p_staff_id is null then
    raise exception 'Pick your name from the staff list';
  end if;
  if p_room_confirmed is null or p_phone_confirmed is null then
    raise exception 'Confirm your room and room phone';
  end if;
  if char_length(v_reported_room) > 40 then
    raise exception 'Room number is too long';
  end if;
  if char_length(v_notes) > 500 then
    raise exception 'Notes are too long';
  end if;

  select btrim(name), coalesce(btrim(role), ''), coalesce(btrim(room), ''), coalesce(btrim(main_phone), '')
    into v_name, v_role, v_room, v_phone
  from private.staff_directory
  where id = p_staff_id;

  if v_name is null then
    raise exception 'That staff name is not in the directory';
  end if;

  if p_room_confirmed then
    v_room_confirmed := true;
    v_reported_room := '';
  else
    if v_reported_room = '' then
      raise exception 'Enter the room number on your door, or None';
    end if;
    if v_reported_room ~* '^(none|n/?a|no room|unknown|-)$' then
      v_reported_room := '';
    end if;
    if upper(regexp_replace(v_room, '\s+', '', 'g'))
      = upper(regexp_replace(v_reported_room, '\s+', '', 'g')) then
      v_room_confirmed := true;
      v_reported_room := '';
    end if;
  end if;

  begin
    v_phone_norm := private.normalize_room_phone(v_phone);
  exception
    when others then
      v_phone_norm := v_phone;
  end;

  if p_phone_confirmed then
    v_phone_confirmed := true;
  else
    if btrim(coalesce(p_reported_phone, '')) = '' then
      raise exception 'Enter your room phone, Radio, or None';
    end if;
    v_reported_phone := private.normalize_room_phone(p_reported_phone);
    if v_phone_norm = v_reported_phone then
      v_phone_confirmed := true;
      v_reported_phone := '';
    end if;
  end if;

  insert into private.room_phone_forms (
    staff_id, staff_name, role, room_on_file, phone_on_file,
    room_confirmed, phone_confirmed, reported_room, reported_phone, notes,
    submitted_at, updated_at
  )
  values (
    p_staff_id, v_name, v_role, v_room, v_phone,
    v_room_confirmed, v_phone_confirmed, v_reported_room, v_reported_phone, v_notes,
    now(), now()
  )
  on conflict (staff_id) do update set
    staff_name = excluded.staff_name,
    role = excluded.role,
    room_on_file = excluded.room_on_file,
    phone_on_file = excluded.phone_on_file,
    room_confirmed = excluded.room_confirmed,
    phone_confirmed = excluded.phone_confirmed,
    reported_room = excluded.reported_room,
    reported_phone = excluded.reported_phone,
    notes = excluded.notes,
    updated_at = now();

  select jsonb_build_object(
    'ok', true,
    'staff_id', f.staff_id,
    'staff_name', f.staff_name,
    'room_on_file', f.room_on_file,
    'phone_on_file', f.phone_on_file,
    'room_confirmed', f.room_confirmed,
    'phone_confirmed', f.phone_confirmed,
    'reported_room', f.reported_room,
    'reported_phone', f.reported_phone,
    'updated_at', f.updated_at
  )
  into out_row
  from private.room_phone_forms f
  where f.staff_id = p_staff_id;

  return out_row;
end;
$$;

create or replace function public.admin_room_phone_status()
returns jsonb
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select jsonb_build_object(
    'staff', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'role', coalesce(d.role, ''),
          'room', coalesce(d.room, ''),
          'main_phone', coalesce(d.main_phone, ''),
          'email', coalesce(d.email, '')
        )
        order by lower(d.name)
      )
      from private.staff_directory d
      where coalesce(btrim(d.name), '') <> ''
    ), '[]'::jsonb),
    'forms', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'staff_id', f.staff_id,
          'staff_name', f.staff_name,
          'role', f.role,
          'room_on_file', f.room_on_file,
          'phone_on_file', f.phone_on_file,
          'room_confirmed', f.room_confirmed,
          'phone_confirmed', f.phone_confirmed,
          'reported_room', f.reported_room,
          'reported_phone', f.reported_phone,
          'notes', f.notes,
          'submitted_at', f.submitted_at,
          'updated_at', f.updated_at
        )
        order by lower(f.staff_name)
      )
      from private.room_phone_forms f
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_apply_room_phone(
  p_staff_id bigint,
  p_room text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_name text;
  v_room text := btrim(coalesce(p_room, ''));
  v_phone text;
begin
  if p_staff_id is null then
    raise exception 'staff_id required';
  end if;
  if char_length(v_room) > 40 then
    raise exception 'Room number is too long';
  end if;
  v_phone := private.normalize_room_phone(p_phone);

  update private.staff_directory
    set room = v_room,
        main_phone = v_phone,
        updated_at = now()
    where id = p_staff_id
    returning name into v_name;

  if v_name is null then
    raise exception 'Staff not found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'staff_id', p_staff_id,
    'staff_name', v_name,
    'room', v_room,
    'main_phone', v_phone
  );
end;
$$;

create or replace function public.admin_delete_room_phone(p_staff_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_name text;
begin
  if p_staff_id is null then
    raise exception 'staff_id required';
  end if;

  delete from private.room_phone_forms
    where staff_id = p_staff_id
    returning staff_name into v_name;

  return jsonb_build_object(
    'ok', true,
    'staff_id', p_staff_id,
    'deleted', v_name is not null,
    'staff_name', coalesce(v_name, '')
  );
end;
$$;

revoke all on function public.list_room_phone_staff() from public;
revoke all on function public.preview_room_phone(bigint) from public;
revoke all on function public.submit_room_phone(bigint, boolean, boolean, text, text, text) from public;
revoke all on function public.admin_room_phone_status() from public, anon, authenticated;
revoke all on function public.admin_apply_room_phone(bigint, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_room_phone(bigint) from public, anon, authenticated;

grant execute on function public.list_room_phone_staff() to anon, authenticated, service_role;
grant execute on function public.preview_room_phone(bigint) to anon, authenticated, service_role;
grant execute on function public.submit_room_phone(bigint, boolean, boolean, text, text, text) to anon, authenticated, service_role;
grant execute on function public.admin_room_phone_status() to service_role;
grant execute on function public.admin_apply_room_phone(bigint, text, text) to service_role;
grant execute on function public.admin_delete_room_phone(bigint) to service_role;
