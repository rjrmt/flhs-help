-- Store full A/B period schedules on the private student roster.
-- Public lookups still return only identity + A/B first-period teacher/room.

alter table private.students
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists ell text not null default '',
  add column if not exists ese text not null default '',
  add column if not exists plan_504 text not null default '',
  add column if not exists cell_phone text not null default '',
  add column if not exists device_ack boolean not null default false,
  add column if not exists device_choice text not null default '',
  add column if not exists schedule jsonb not null default '{}'::jsonb,
  add column if not exists active boolean not null default true;
