-- Extends notify_habit_log_completion() (00000000000023_notify_completion_trigger.sql)
-- to also fire for incidents — the original version only covered
-- walk/water/food. An incident (a seizure, a fall) is exactly the kind of
-- event a co-caregiver most needs to hear about immediately, so it gets its
-- own payload carrying the incident's category, letting notify-completion
-- filter by each recipient's notify_incident_categories
-- (00000000000024_incident_notification_preferences.sql) instead of the
-- blanket notify_completed_by_others toggle used for the other habit types.
--
-- create or replace (not a new trigger) — the trigger itself, defined in
-- 00000000000023, still points at this same function name and needs no
-- changes.

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
  elsif new.type = 'incident' then
    perform net.http_post(
      url := 'https://iwespdpcopwxdrmwzbsk.supabase.co/functions/v1/notify-completion',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZXNwZHBjb3B3eGRybXd6YnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDg2NDAsImV4cCI6MjEwNDEyNDY0MH0.Y_2kf-X5hOBIxRgmtaISAgKsW_zvgA_9r0sQ5aidreM',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'petId', new.pet_id,
        'actorUserId', new.logged_by,
        'kind', 'incident',
        'referenceId', new.id,
        'incidentCategory', new.details->>'category'
      )
    );
  end if;
  return new;
end;
$$;
