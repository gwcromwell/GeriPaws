-- Near-real-time "someone else took care of this" push: fires the
-- notify-completion Edge Function whenever a habit is logged (walk/water/
-- food) or a medication dose is recorded as given, so other caregivers of
-- the same pet who want that notification (pet_members.notify_completed_by_others)
-- hear about it immediately rather than waiting for the hourly
-- send-reminders digest. Uses pg_net (already enabled by migration
-- 00000000000005_reminders_cron.sql) for a fire-and-forget async HTTP call —
-- same mechanism that migration already uses to call an Edge Function from
-- SQL, just triggered by a row event instead of pg_cron.
--
-- The Authorization header reuses the same non-secret anon key already
-- inlined in 00000000000005_reminders_cron.sql (see that file's comment for
-- why this is safe) — it only proves the request came from this Supabase
-- project, satisfying the Edge Function's default JWT check.

create or replace function notify_habit_log_completion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.type in ('walk', 'water', 'food') then
    perform net.http_post(
      url := 'https://iwespdpcopwxdrmwzbsk.supabase.co/functions/v1/notify-completion',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZXNwZHBjb3B3eGRybXd6YnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDg2NDAsImV4cCI6MjEwNDEyNDY0MH0.Y_2kf-X5hOBIxRgmtaISAgKsW_zvgA_9r0sQ5aidreM',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'petId', new.pet_id,
        'actorUserId', new.logged_by,
        'kind', new.type,
        'referenceId', new.id
      )
    );
  end if;
  return new;
end;
$$;

create trigger notify_habit_log_completion_trigger
  after insert on habit_logs
  for each row execute function notify_habit_log_completion();

create or replace function notify_medication_dose_completion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.given_at is not null then
    perform net.http_post(
      url := 'https://iwespdpcopwxdrmwzbsk.supabase.co/functions/v1/notify-completion',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZXNwZHBjb3B3eGRybXd6YnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDg2NDAsImV4cCI6MjEwNDEyNDY0MH0.Y_2kf-X5hOBIxRgmtaISAgKsW_zvgA_9r0sQ5aidreM',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'petId', new.pet_id,
        'actorUserId', new.given_by,
        'kind', 'medication',
        'referenceId', new.medication_id,
        'scheduledAt', new.scheduled_at
      )
    );
  end if;
  return new;
end;
$$;

-- Covers both paths that produce a given dose: the normal "mark given" flow
-- (an INSERT with given_at already set — see recordDoseGiven in
-- src/lib/medications.ts) and the skipped->given correction flow (an UPDATE
-- that only now sets given_at — see updateDoseGivenAt in that same file).
create trigger notify_medication_dose_completion_insert_trigger
  after insert on medication_doses
  for each row
  when (new.given_at is not null)
  execute function notify_medication_dose_completion();

create trigger notify_medication_dose_completion_update_trigger
  after update on medication_doses
  for each row
  when (new.given_at is not null and old.given_at is null)
  execute function notify_medication_dose_completion();
