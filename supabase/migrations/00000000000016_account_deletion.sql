-- Self-service account deletion (App Store guideline 5.1.1(v) requires an
-- app that supports account creation to also support in-app deletion).
--
-- Every one of these columns previously had no ON DELETE behavior (Postgres
-- default: RESTRICT), which would make deleting an auth user fail with a
-- foreign key violation the moment they'd ever logged an entry, answered a
-- QOL check-in, uploaded a photo, etc. — i.e. almost any real user. They're
-- attribution fields, not ownership, so switching them to SET NULL preserves
-- a pet's shared history for its other caregivers (the app already renders a
-- null attribution as "A caregiver" — see displayNameFor in
-- apps/geripaws-app/src/lib/profiles.ts) instead of either blocking deletion
-- outright or silently destroying that history.

alter table pets alter column created_by drop not null;
alter table pets drop constraint pets_created_by_fkey;
alter table pets add constraint pets_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table pet_members drop constraint pet_members_invited_by_fkey;
alter table pet_members add constraint pet_members_invited_by_fkey
  foreign key (invited_by) references auth.users (id) on delete set null;

alter table pet_invites alter column invited_by drop not null;
alter table pet_invites drop constraint pet_invites_invited_by_fkey;
alter table pet_invites add constraint pet_invites_invited_by_fkey
  foreign key (invited_by) references auth.users (id) on delete set null;

alter table habit_logs alter column logged_by drop not null;
alter table habit_logs drop constraint habit_logs_logged_by_fkey;
alter table habit_logs add constraint habit_logs_logged_by_fkey
  foreign key (logged_by) references auth.users (id) on delete set null;

alter table medication_doses drop constraint medication_doses_given_by_fkey;
alter table medication_doses add constraint medication_doses_given_by_fkey
  foreign key (given_by) references auth.users (id) on delete set null;

alter table ailment_notes alter column created_by drop not null;
alter table ailment_notes drop constraint ailment_notes_created_by_fkey;
alter table ailment_notes add constraint ailment_notes_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table qol_responses alter column answered_by drop not null;
alter table qol_responses drop constraint qol_responses_answered_by_fkey;
alter table qol_responses add constraint qol_responses_answered_by_fkey
  foreign key (answered_by) references auth.users (id) on delete set null;

alter table attachments alter column created_by drop not null;
alter table attachments drop constraint attachments_created_by_fkey;
alter table attachments add constraint attachments_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table pet_share_links alter column created_by drop not null;
alter table pet_share_links drop constraint pet_share_links_created_by_fkey;
alter table pet_share_links add constraint pet_share_links_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- delete_my_account — self-service account deletion
-- ---------------------------------------------------------------------------
-- For every pet the caller solely owns, this either deletes the pet outright
-- (nobody else has any stake in it — cascades to all its habit logs,
-- ailments, medications, etc.) or hands ownership to the longest-tenured
-- remaining caregiver/viewer, so a shared pet's history isn't destroyed or
-- left without an owner just because one co-owner deleted their account.
-- The caller's own pet_members rows and profile already cascade
-- automatically (pet_members.user_id and profiles.id are ON DELETE CASCADE),
-- so the final step is simply removing the auth user itself. Deleting a row
-- directly from auth.users from a security-definer function is Supabase's
-- documented pattern for self-service account deletion — the app is
-- responsible for cleaning up any Storage objects (pet avatars, incident
-- media) belonging to pets that get deleted here *before* calling this, the
-- same way the app already cleans up Storage before deleting other rows
-- (see deleteAttachmentsFor) — a database cascade can't reach into Storage.
create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_pet record;
  successor uuid;
begin
  for owned_pet in
    select pet_id from pet_members where user_id = auth.uid() and role = 'owner'
  loop
    select user_id into successor
    from pet_members
    where pet_id = owned_pet.pet_id and user_id != auth.uid()
    order by joined_at asc
    limit 1;

    if successor is null then
      delete from pets where id = owned_pet.pet_id;
    else
      update pet_members set role = 'owner' where pet_id = owned_pet.pet_id and user_id = successor;
    end if;
  end loop;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_my_account() to authenticated;
