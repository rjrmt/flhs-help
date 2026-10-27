-- Laptop Desk / eligibility use Focus Device Checkout Choice.
-- Opt-In = approved for take-home registration. Count only active students.

create or replace function private.laptop_opt_in_count()
returns integer
language sql
stable
security definer
set search_path to 'private'
as $$
  select count(*)::integer
  from private.students
  where active
    and (
      laptop_opt_in
      or lower(btrim(device_choice)) = 'opt-in'
    );
$$;

drop function if exists public.lookup_laptop_student(text);
drop function if exists private.lookup_laptop_student(text);

create function private.lookup_laptop_student(p_student_id text)
returns table (
  student_id text,
  name text,
  grade text,
  white_teacher text,
  white_room text,
  blue_teacher text,
  blue_room text,
  laptop_opt_in boolean,
  device_choice text
)
language sql
stable
security definer
set search_path to 'private'
as $$
  select
    s.student_id,
    s.name,
    s.grade,
    s.white_teacher,
    s.white_room,
    s.blue_teacher,
    s.blue_room,
    (
      s.laptop_opt_in
      or lower(btrim(s.device_choice)) = 'opt-in'
    ) as laptop_opt_in,
    coalesce(s.device_choice, '') as device_choice
  from private.students s
  where s.active
    and s.student_id = lpad(
      regexp_replace(coalesce(p_student_id, ''), '[^0-9]', '', 'g'),
      10,
      '0'
    )
  limit 1;
$$;

create function public.lookup_laptop_student(p_student_id text)
returns table (
  student_id text,
  name text,
  grade text,
  white_teacher text,
  white_room text,
  blue_teacher text,
  blue_room text,
  laptop_opt_in boolean,
  device_choice text
)
language sql
stable
set search_path to 'public', 'private'
as $$
  select * from private.lookup_laptop_student(p_student_id);
$$;

grant execute on function public.lookup_laptop_student(text) to anon, authenticated;
grant execute on function private.lookup_laptop_student(text) to anon, authenticated;
grant execute on function private.laptop_opt_in_count() to anon, authenticated;
