-- Fixup, not a schema change. Migrations 00000000000020 through
-- 00000000000025 were applied directly via `supabase db push` (the Supabase
-- CLI's own migration history, tracked in supabase_migrations.schema_migrations)
-- rather than through this repo's actual deploy path: the `migrate` job in
-- .github/workflows/deploy-pages.yml, which applies supabase/migrations/*.sql
-- via plain psql on every push to main and tracks what it's already run in
-- its own separate ledger, public._schema_migrations (see that workflow —
-- these two tracking tables don't know about each other).
--
-- Because those six files' *effects* existed in the database but were never
-- recorded in _schema_migrations, the next three pushes to main all failed
-- at the `migrate` job: it tried to re-run 00000000000020_habit_schedules.sql
-- from scratch and hit "relation already exists" (none of these migration
-- files are written to be safely re-run — see that job's own comment).
--
-- This backfills the missing ledger rows so `migrate` recognizes those six
-- as already applied. `on conflict do nothing` makes it safe to run twice —
-- once here via `supabase db push` (to unblock the very next CI run) and
-- once more when the `migrate` job itself applies this same file and finds
-- it not yet in its own ledger.
insert into public._schema_migrations (version) values
  ('00000000000020_habit_schedules.sql'),
  ('00000000000021_notification_preferences.sql'),
  ('00000000000022_habit_overdue_notification_kinds.sql'),
  ('00000000000023_notify_completion_trigger.sql'),
  ('00000000000024_incident_notification_preferences.sql'),
  ('00000000000025_notify_incident_completion.sql')
on conflict (version) do nothing;
