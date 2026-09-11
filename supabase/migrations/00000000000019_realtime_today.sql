-- Enables Postgres Changes (Realtime) on the tables the Today screen needs
-- live cross-device sync on. Without this, a caregiver's action (logging a
-- walk, giving a dose) only shows up on another already-open device once
-- that screen next regains navigation focus — which can be indefinitely if
-- it's just sitting open (e.g. a tablet on the counter). RLS already
-- restricts these tables to pet members, and Realtime respects that same
-- RLS when deciding which subscribed clients receive each change.
alter publication supabase_realtime add table habit_logs;
alter publication supabase_realtime add table medication_doses;
alter publication supabase_realtime add table medications;
alter publication supabase_realtime add table qol_responses;
alter publication supabase_realtime add table qol_settings;
