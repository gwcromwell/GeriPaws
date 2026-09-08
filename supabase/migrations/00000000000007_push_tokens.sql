-- Device push tokens for native notifications (Phase 4). A token belongs to
-- a user account, not a pet — one person may caregive for several dogs and
-- should get pushes about all of them on the same device(s) they've
-- registered. Purely private: only the owning user (and the service role,
-- for the reminders function) ever touches these rows.

create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table push_tokens enable row level security;

create policy push_tokens_own on push_tokens
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
