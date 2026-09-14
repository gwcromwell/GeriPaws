-- Expected walk/food times per pet, so the overdue-reminder machinery (which
-- already understands medication schedules) has something to check walks and
-- food against. Absence of a row for a given (pet_id, type) means "no
-- schedule set" — overdue checks simply skip that type for that pet, same as
-- a medication with an "as_needed" schedule is skipped today.
--
-- `schedule` reuses the same shape as medications.schedule (times_per_day /
-- interval_hours / specific_days — never "as_needed", which wouldn't make
-- sense for a recurring expectation like a walk or a meal) so the existing
-- due-time math (packages/shared/src/schedule.ts, mirrored in
-- supabase/functions/send-reminders/schedule-lib.ts) works unchanged.

create table habit_schedules (
  pet_id uuid not null references pets (id) on delete cascade,
  type text not null check (type in ('walk', 'food')),
  schedule jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (pet_id, type)
);

alter table habit_schedules enable row level security;

create policy habit_schedules_select on habit_schedules
  for select using (is_pet_member(pet_id, 'viewer'));

create policy habit_schedules_write on habit_schedules
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));
