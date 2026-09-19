-- Lets the accept-invite screen show which dog and role an invite is for
-- before the invitee commits to joining, instead of silently auto-accepting
-- the moment a signed-in user opens the link. Mirrors accept_pet_invite's
-- own security model (pending, unexpired, and addressed to the caller's own
-- email) so this can't be used to enumerate other pets' names by guessing
-- tokens.
create or replace function preview_pet_invite(invite_token uuid)
returns table (pet_name text, role pet_role)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select pets.name, pet_invites.role
    from pet_invites
    join pets on pets.id = pet_invites.pet_id
    where pet_invites.token = invite_token
      and pet_invites.status = 'pending'
      and pet_invites.expires_at > now()
      and lower(pet_invites.email) = lower(auth.jwt() ->> 'email');
end;
$$;
