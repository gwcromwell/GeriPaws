-- Time-limited, revocable, read-only links for sharing a pet's clinical
-- summary with a vet (or anyone) who has no GeriPaws account. Only the
-- token proves access — there is no RLS path for anonymous users to read
-- pet data directly; the get-shared-pet Edge Function validates the token
-- and uses the service role to assemble a read-only snapshot.

create table pet_share_links (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked boolean not null default false
);

create unique index pet_share_links_token_idx on pet_share_links (token);
create index pet_share_links_pet_id_idx on pet_share_links (pet_id);

alter table pet_share_links enable row level security;

create policy pet_share_links_select on pet_share_links
  for select using (is_pet_member(pet_id, 'owner'));

create policy pet_share_links_insert on pet_share_links
  for insert with check (is_pet_member(pet_id, 'owner') and created_by = auth.uid());

create policy pet_share_links_update on pet_share_links
  for update using (is_pet_member(pet_id, 'owner'));

create policy pet_share_links_delete on pet_share_links
  for delete using (is_pet_member(pet_id, 'owner'));
