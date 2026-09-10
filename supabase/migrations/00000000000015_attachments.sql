-- Photo/video attachments for incidents (habit_logs) and ailments. One
-- polymorphic table rather than a column/array on each of those tables, so
-- there's a single upload/read path, a single RLS policy set, and "all media
-- for this pet" queries work without a union across tables (useful for a
-- future vet-visit export).

create table attachments (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  entity_type text not null check (entity_type in ('habit_log', 'ailment')),
  entity_id uuid not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  size_bytes bigint not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index attachments_entity_idx on attachments (entity_type, entity_id);
create index attachments_pet_id_idx on attachments (pet_id);

-- entity_id can't be a real foreign key since it points at one of two
-- different tables depending on entity_type. Without this trigger, RLS would
-- only verify the client-supplied pet_id is one the caller is a caregiver of
-- — not that entity_id actually belongs to that pet — so a caregiver on pet B
-- could otherwise attach media to pet A's incident by pairing an entity_id
-- from A with pet_id = B. This looks up the true owning pet and overwrites
-- whatever the client sent, the same defensive pattern already used by
-- protect_pet_members_privileged_columns().
create or replace function set_attachment_pet_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_pet_id uuid;
begin
  if new.entity_type = 'habit_log' then
    select pet_id into owning_pet_id from habit_logs where id = new.entity_id;
  elsif new.entity_type = 'ailment' then
    select pet_id into owning_pet_id from ailments where id = new.entity_id;
  end if;

  if owning_pet_id is null then
    raise exception 'No % found for entity_id %', new.entity_type, new.entity_id;
  end if;

  new.pet_id := owning_pet_id;
  return new;
end;
$$;

create trigger set_attachment_pet_id_trigger
  before insert on attachments
  for each row execute function set_attachment_pet_id();

alter table attachments enable row level security;

create policy attachments_select on attachments
  for select using (is_pet_member(pet_id, 'viewer'));

create policy attachments_insert on attachments
  for insert with check (is_pet_member(pet_id, 'caregiver'));

create policy attachments_delete on attachments
  for delete using (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- incident-media storage bucket
-- ---------------------------------------------------------------------------
-- Private (unlike pet-photos): this is sensitive health content — a seizure
-- video, a wound photo — not a display avatar, so it should never be
-- readable by a bare URL. Reads go through signed URLs instead. The size
-- limit is 150 MB to accommodate an uncompressed video on platforms where
-- client-side compression isn't available (see the app's upload code) —
-- native uploads are expected to land well under this after compression.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-media',
  'incident-media',
  false,
  157286400,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

create policy "Pet members can view incident media"
on storage.objects for select
using (
  bucket_id = 'incident-media'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'viewer')
);

create policy "Caregivers can upload incident media"
on storage.objects for insert
with check (
  bucket_id = 'incident-media'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'caregiver')
);

create policy "Caregivers can delete incident media"
on storage.objects for delete
using (
  bucket_id = 'incident-media'
  and is_pet_member((storage.foldername(name))[1]::uuid, 'caregiver')
);
