-- Self-service "leave this dog" — lets a caregiver/viewer unlink themselves
-- from a shared pet without touching its data (the opposite of deletion),
-- and lets a sole owner hand off ownership and leave rather than being
-- stuck as the only way to manage the pet forever. Mirrors delete_my_account
-- (00000000000016_account_deletion.sql) exactly, just scoped to one pet
-- instead of every pet the caller owns — including the same
-- longest-tenured-member-becomes-successor rule.
--
-- Deliberately never deletes the pet itself: if the caller is its only
-- member at all, there's no successor to hand off to, and this raises
-- rather than silently destroying the pet's history or leaving it ownerless
-- — the caller can invite a co-caregiver first, or delete the pet
-- outright as a separate, deliberate action, if that's actually what they
-- want.
create or replace function leave_pet(target_pet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_role pet_role;
  successor uuid;
begin
  select role into my_role from pet_members where pet_id = target_pet_id and user_id = auth.uid();
  if my_role is null then
    raise exception 'You are not a member of this dog.';
  end if;

  if my_role = 'owner' then
    select user_id into successor
    from pet_members
    where pet_id = target_pet_id and user_id != auth.uid()
    order by joined_at asc
    limit 1;

    if successor is null then
      raise exception 'You are the only person with access to this dog — invite a co-caregiver first if you want to hand it off, or delete the dog instead of leaving.';
    end if;

    update pet_members set role = 'owner' where pet_id = target_pet_id and user_id = successor;
  end if;

  -- created_by is documented as an audit field, not an access grant (see
  -- 00000000000016_account_deletion.sql) — but pets_select's own fallback
  -- clause (`or created_by = auth.uid()`, needed only for the brief
  -- bootstrap window right after a pet is inserted — see
  -- 00000000000002_rls_policies.sql) would otherwise let a pet's original
  -- creator keep fetching it directly by id even after leaving entirely.
  -- Clearing it here gives it the same treatment whole-account deletion
  -- already does via that column's ON DELETE SET NULL foreign key.
  update pets set created_by = null where id = target_pet_id and created_by = auth.uid();

  delete from pet_members where pet_id = target_pet_id and user_id = auth.uid();
end;
$$;

grant execute on function leave_pet(uuid) to authenticated;
