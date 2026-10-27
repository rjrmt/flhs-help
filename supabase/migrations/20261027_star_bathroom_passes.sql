-- STAR kiosk bathroom passes + Mission Control helpers.
-- Applied to FLHS Ops (lharxnpvcprthgabklwo). Student PII stays in private.

create table if not exists private.kiosk_bathroom_passes (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  student_name text not null default '',
  grade text not null default '',
  issued_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text not null default ''
);

create index if not exists kiosk_bathroom_active_idx
  on private.kiosk_bathroom_passes (issued_at desc)
  where returned_at is null;

create table if not exists private.kiosk_settings (
  key text primary key,
  value text not null default ''
);

insert into private.kiosk_settings (key, value)
values ('bathroom_max_active', '5')
on conflict (key) do nothing;
