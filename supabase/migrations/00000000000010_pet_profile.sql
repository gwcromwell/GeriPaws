-- Pet profile: spay/neuter status, plus a Storage bucket for pet avatar photos.
-- dob, sex, and photo_url already existed on pets from the initial schema but
-- were never exposed in the app.

alter table pets add column neutered boolean;

-- ---------------------------------------------------------------------------
-- pet-photos storage bucket
-- ---------------------------------------------------------------------------
-- Public read (avatars aren't sensitive and need to render on public vet
-- share links without an authenticated session); writes are restricted to
-- pet members via the object path convention "{petId}/{filename}", checked
-- against the same is_pet_member() helper used by every other pet-scoped
-- table.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "Pet photos are publicly readable"
on storage.objects for select
using (bucket_id = 'pet-photos');

create policy "Caregivers can upload pet photos"
on storage.objects for insert
with check (
  bucket_id = 'pet-photos'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'caregiver')
);

create policy "Caregivers can replace pet photos"
on storage.objects for update
using (
  bucket_id = 'pet-photos'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'caregiver')
);

create policy "Caregivers can delete pet photos"
on storage.objects for delete
using (
  bucket_id = 'pet-photos'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'caregiver')
);
