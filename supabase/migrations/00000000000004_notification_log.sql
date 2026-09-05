-- Dedup log for the send-reminders Edge Function: at most one email per
-- pet/kind/reference per calendar day, so an hourly cron doesn't spam the
-- same overdue dose, low refill, or overdue QOL check-in repeatedly.
-- Written only by the Edge Function via the service role key, which bypasses
-- RLS entirely — no policies are defined, so no anon/authenticated client
-- (including this app) can read or write it directly.

create type notification_kind as enum ('medication_overdue', 'refill_low', 'qol_overdue');

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  kind notification_kind not null,
  reference_id text not null,
  notif_date date not null default current_date,
  sent_at timestamptz not null default now(),
  unique (pet_id, kind, reference_id, notif_date)
);

alter table notification_log enable row level security;
