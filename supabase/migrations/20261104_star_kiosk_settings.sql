-- Staff settings for the STAR kiosk: bathroom limit and subject list.
-- Called only by the manage-kiosks edge function (service role).

create or replace function public.admin_kiosk_get_config()
returns jsonb
language sql
stable
security definer
set search_path = private
as $$
  select jsonb_build_object(
    'bathroom_max_active', coalesce((
      select case
        when value ~ '^[0-9]+$' then greatest(1, value::int)
        else 5
      end
      from kiosk_settings
      where key = 'bathroom_max_active'
    ), 5),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'code', s.code,
        'label', s.label,
        'sort_order', s.sort_order,
        'active', s.active
      ) order by s.sort_order, s.label)
      from kiosk_subjects s
      where s.program = 'star'
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_kiosk_save_config(p_bathroom_max integer, p_subjects jsonb)
returns jsonb
language plpgsql
security definer
set search_path = private
as $$
declare
  item jsonb;
  sid uuid;
  lbl text;
  ord int := 0;
  on_kiosk boolean;
  base text;
  slug text;
  suffix int;
  seen uuid[] := '{}';
begin
  if p_bathroom_max is null or p_bathroom_max < 1 or p_bathroom_max > 30 then
    raise exception 'bathroom max must be between 1 and 30';
  end if;
  if p_subjects is null or jsonb_typeof(p_subjects) <> 'array' then
    raise exception 'subjects must be a list';
  end if;

  insert into kiosk_settings (key, value)
  values ('bathroom_max_active', p_bathroom_max::text)
  on conflict (key) do update set value = excluded.value;

  for item in select value from jsonb_array_elements(p_subjects)
  loop
    ord := ord + 1;
    lbl := btrim(coalesce(item->>'label', ''));
    if lbl = '' or char_length(lbl) > 80 then
      raise exception 'each subject needs a name under 80 characters';
    end if;
    on_kiosk := coalesce((item->>'active')::boolean, true);

    if coalesce(item->>'id', '') <> '' then
      sid := (item->>'id')::uuid;
      update kiosk_subjects
      set label = lbl,
          sort_order = ord * 10,
          active = on_kiosk
      where id = sid
        and program = 'star';
      if not found then
        raise exception 'unknown subject';
      end if;
    else
      base := lower(regexp_replace(lbl, '[^a-zA-Z0-9]+', '-', 'g'));
      base := trim(both '-' from base);
      if base = '' then
        base := 'subject';
      end if;
      slug := base;
      suffix := 2;
      while exists (
        select 1 from kiosk_subjects where program = 'star' and code = slug
      ) loop
        slug := base || '-' || suffix::text;
        suffix := suffix + 1;
        if suffix > 40 then
          raise exception 'could not name that subject';
        end if;
      end loop;
      insert into kiosk_subjects (program, code, label, sort_order, active)
      values ('star', slug, lbl, ord * 10, on_kiosk)
      returning id into sid;
    end if;

    seen := array_append(seen, sid);
  end loop;

  update kiosk_subjects
  set active = false
  where program = 'star'
    and not (id = any(seen));

  return public.admin_kiosk_get_config();
end;
$$;

revoke all on function public.admin_kiosk_get_config() from public, anon, authenticated;
revoke all on function public.admin_kiosk_save_config(integer, jsonb) from public, anon, authenticated;
grant execute on function public.admin_kiosk_get_config() to service_role;
grant execute on function public.admin_kiosk_save_config(integer, jsonb) to service_role;
