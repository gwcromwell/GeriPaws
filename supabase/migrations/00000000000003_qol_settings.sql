-- Quality of Life tracking is optional per pet (off by default) and has a
-- caregiver-chosen check-in cadence. qol_responses already existed from the
-- initial schema; this adds the settings row that gates/paces it.

create type qol_cadence as enum ('daily', 'weekly', 'monthly');

create table qol_settings (
  pet_id uuid primary key references pets (id) on delete cascade,
  enabled boolean not null default false,
  cadence qol_cadence not null default 'weekly',
  updated_at timestamptz not null default now()
);

alter table qol_settings enable row level security;

create policy qol_settings_select on qol_settings
  for select using (is_pet_member(pet_id, 'viewer'));

create policy qol_settings_write on qol_settings
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));
