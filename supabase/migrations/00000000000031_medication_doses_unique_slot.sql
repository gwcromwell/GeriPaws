-- Nothing stopped two caregivers from independently logging the same dose
-- slot (e.g. both tapping "Mark given" on the same due-reminder notification
-- within moments of each other) — each insert succeeded, creating two rows
-- for one dose and silently double-decrementing the refill count. Worse, the
-- app had no way to detect this and tell the second caregiver "already
-- logged" gracefully.
--
-- First dedupe any doses that already collided (keep the earliest row per
-- slot — the one that "actually" logged it first), then constrain the table
-- so this can never happen again; markDoseGiven/markDoseSkipped now catch
-- the resulting unique-violation and surface a friendly message instead of
-- creating a silent duplicate.
delete from medication_doses
where id in (
  select id
  from (
    select id, row_number() over (
      partition by medication_id, scheduled_at
      order by created_at asc, id asc
    ) as rn
    from medication_doses
  ) ranked
  where rn > 1
);

alter table medication_doses
  add constraint medication_doses_medication_id_scheduled_at_key unique (medication_id, scheduled_at);
