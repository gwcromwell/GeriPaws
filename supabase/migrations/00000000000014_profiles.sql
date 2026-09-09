-- Lets the app attribute an action ("Given by Amanda") to a caregiver by
-- name instead of a bare user id. auth.users isn't queryable from the client
-- (nor should it be — it's Supabase's own auth table), so this mirrors just
-- the display-safe bits into a table the app can actually select from.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Visible to yourself, and to anyone you share at least one pet with — the
-- same "co-caregiver" boundary every other pet-scoped table uses, just
-- expressed directly over pet_members since a profile isn't itself pet-scoped.
create policy profiles_select on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from pet_members mine
      join pet_members theirs on theirs.pet_id = mine.pet_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- New signups get a profile row automatically.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill everyone who signed up before this migration existed.
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
