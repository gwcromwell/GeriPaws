-- Row Level Security for all pet-scoped tables, plus the bootstrap trigger
-- that makes a pet's creator its owner, and the invite-accept RPC.

-- ---------------------------------------------------------------------------
-- Bootstrap: inserting a pet has nothing in pet_members yet to authorize it
-- via is_pet_member(), so we allow insert when created_by = auth.uid(), then
-- a security-definer trigger creates the owner membership row (bypassing RLS,
-- since the inserting user isn't a member yet at insert time).
-- ---------------------------------------------------------------------------
create or replace function handle_new_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pet_members (pet_id, user_id, role, invited_by)
  values (new.id, new.created_by, 'owner', new.created_by);
  return new;
end;
$$;

create trigger on_pet_created
  after insert on pets
  for each row execute function handle_new_pet();

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------
alter table pets enable row level security;

-- The `or created_by = auth.uid()` fallback matters at INSERT time: with
-- `Prefer: return=representation` (RETURNING *), Postgres requires the new
-- row to also satisfy the SELECT policy, evaluated before the AFTER INSERT
-- bootstrap trigger's pet_members row is visible to it. Without this
-- fallback, creating a pet fails with "new row violates row-level security
-- policy for table pets" even though the INSERT's own WITH CHECK passes.
create policy pets_select on pets
  for select using (is_pet_member(id, 'viewer') or created_by = auth.uid());

create policy pets_insert on pets
  for insert with check (created_by = auth.uid());

create policy pets_update on pets
  for update using (is_pet_member(id, 'owner'));

create policy pets_delete on pets
  for delete using (is_pet_member(id, 'owner'));

-- ---------------------------------------------------------------------------
-- pet_members
-- ---------------------------------------------------------------------------
alter table pet_members enable row level security;

create policy pet_members_select on pet_members
  for select using (is_pet_member(pet_id, 'viewer'));

create policy pet_members_insert on pet_members
  for insert with check (is_pet_member(pet_id, 'owner'));

create policy pet_members_update on pet_members
  for update using (is_pet_member(pet_id, 'owner'));

create policy pet_members_delete on pet_members
  for delete using (is_pet_member(pet_id, 'owner'));

-- ---------------------------------------------------------------------------
-- pet_invites — only owners manage invites directly; accepting an invite
-- goes through accept_pet_invite() below rather than a direct RLS grant,
-- since the accepting user isn't a pet member yet.
-- ---------------------------------------------------------------------------
alter table pet_invites enable row level security;

create policy pet_invites_select on pet_invites
  for select using (is_pet_member(pet_id, 'owner'));

create policy pet_invites_insert on pet_invites
  for insert with check (is_pet_member(pet_id, 'owner'));

create policy pet_invites_update on pet_invites
  for update using (is_pet_member(pet_id, 'owner'));

create policy pet_invites_delete on pet_invites
  for delete using (is_pet_member(pet_id, 'owner'));

create or replace function accept_pet_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite pet_invites%rowtype;
begin
  select * into invite
  from pet_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now()
    and lower(email) = lower(auth.jwt() ->> 'email');

  if not found then
    raise exception 'Invite not found, expired, or not addressed to this account';
  end if;

  insert into pet_members (pet_id, user_id, role, invited_by)
  values (invite.pet_id, auth.uid(), invite.role, invite.invited_by)
  on conflict (pet_id, user_id) do update set role = excluded.role;

  update pet_invites set status = 'accepted' where id = invite.id;

  return invite.pet_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- habit_logs
-- ---------------------------------------------------------------------------
alter table habit_logs enable row level security;

create policy habit_logs_select on habit_logs
  for select using (is_pet_member(pet_id, 'viewer'));

create policy habit_logs_insert on habit_logs
  for insert with check (is_pet_member(pet_id, 'caregiver'));

create policy habit_logs_update on habit_logs
  for update using (is_pet_member(pet_id, 'caregiver'));

create policy habit_logs_delete on habit_logs
  for delete using (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- ailments
-- ---------------------------------------------------------------------------
alter table ailments enable row level security;

create policy ailments_select on ailments
  for select using (is_pet_member(pet_id, 'viewer'));

create policy ailments_write on ailments
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- medications
-- ---------------------------------------------------------------------------
alter table medications enable row level security;

create policy medications_select on medications
  for select using (is_pet_member(pet_id, 'viewer'));

create policy medications_write on medications
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- medication_doses
-- ---------------------------------------------------------------------------
alter table medication_doses enable row level security;

create policy medication_doses_select on medication_doses
  for select using (is_pet_member(pet_id, 'viewer'));

create policy medication_doses_write on medication_doses
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- medication_refills
-- ---------------------------------------------------------------------------
alter table medication_refills enable row level security;

create policy medication_refills_select on medication_refills
  for select using (is_pet_member(pet_id, 'viewer'));

create policy medication_refills_write on medication_refills
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- ailment_notes
-- ---------------------------------------------------------------------------
alter table ailment_notes enable row level security;

create policy ailment_notes_select on ailment_notes
  for select using (is_pet_member(pet_id, 'viewer'));

create policy ailment_notes_write on ailment_notes
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- vet_questions
-- ---------------------------------------------------------------------------
alter table vet_questions enable row level security;

create policy vet_questions_select on vet_questions
  for select using (is_pet_member(pet_id, 'viewer'));

create policy vet_questions_write on vet_questions
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));

-- ---------------------------------------------------------------------------
-- qol_responses
-- ---------------------------------------------------------------------------
alter table qol_responses enable row level security;

create policy qol_responses_select on qol_responses
  for select using (is_pet_member(pet_id, 'viewer'));

create policy qol_responses_write on qol_responses
  for all using (is_pet_member(pet_id, 'caregiver'))
  with check (is_pet_member(pet_id, 'caregiver'));
