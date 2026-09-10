-- Makes accept_pet_invite() idempotent: retrying an invite link after it was
-- already accepted (a page refresh, a second click on the same email link,
-- or the client re-running the accept flow after a transient UI error) used
-- to raise "Invite not found, expired, or not addressed to this account"
-- once status flipped to 'accepted' — which reads as a failure even though
-- the caller is already a member. Now checks existing membership first and
-- returns success for a caller who's already in.
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
    and lower(email) = lower(auth.jwt() ->> 'email');

  if not found then
    raise exception 'Invite not found or not addressed to this account';
  end if;

  if exists (
    select 1 from pet_members
    where pet_id = invite.pet_id and user_id = auth.uid()
  ) then
    return invite.pet_id;
  end if;

  if invite.status <> 'pending' or invite.expires_at <= now() then
    raise exception 'Invite expired or already used';
  end if;

  insert into pet_members (pet_id, user_id, role, invited_by)
  values (invite.pet_id, auth.uid(), invite.role, invite.invited_by)
  on conflict (pet_id, user_id) do update set role = excluded.role;

  update pet_invites set status = 'accepted' where id = invite.id;

  return invite.pet_id;
end;
$$;
