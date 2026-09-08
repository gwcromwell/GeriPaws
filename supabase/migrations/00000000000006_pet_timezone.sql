-- Medication schedules ("08:00", "every 8 hours from 06:00", etc.) are only
-- meaningful relative to a timezone. Without one, server-side code (the
-- reminders Edge Function) has no way to know what "08:00" means and falls
-- back to the server's own timezone (UTC), which silently mis-times every
-- reminder for any pet whose owner isn't in UTC. The app captures this
-- automatically from the creating device at pet-creation time.

alter table pets add column timezone text not null default 'UTC';

-- Backfill existing pets created before this column existed. Adjust the
-- timezone below if your pets aren't in US Eastern.
update pets set timezone = 'America/New_York' where timezone = 'UTC';
