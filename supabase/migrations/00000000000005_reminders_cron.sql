-- Schedules the send-reminders Edge Function to run hourly.
-- Run this AFTER the send-reminders function has been deployed.
--
-- The Authorization header uses the anon key, which is not a secret (it's
-- already embedded in the client app) — it only proves the request came from
-- a caller of this Supabase project, satisfying the Edge Function's default
-- JWT check. The function's own use of the service-role key (to bypass RLS
-- when scanning every pet) comes from its runtime environment, not this header.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'geripaws-send-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://iwespdpcopwxdrmwzbsk.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZXNwZHBjb3B3eGRybXd6YnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDg2NDAsImV4cCI6MjEwNDEyNDY0MH0.Y_2kf-X5hOBIxRgmtaISAgKsW_zvgA_9r0sQ5aidreM',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
