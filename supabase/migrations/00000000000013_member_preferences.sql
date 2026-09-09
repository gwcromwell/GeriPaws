-- Per-caregiver display preferences for the Today screen: which quick-glance
-- tiles show, and whether the medication list hides doses already given.
-- Lives on pet_members (already the per-user-per-pet row) rather than a new
-- table — these are personal to "how I like to view this dog", not data
-- about the pet itself, and different caregivers of the same pet may
-- reasonably want different views.

alter table pet_members add column show_walk_tile boolean not null default true;
alter table pet_members add column show_water_tile boolean not null default true;
alter table pet_members add column show_food_tile boolean not null default true;
alter table pet_members add column show_weight_tile boolean not null default true;
alter table pet_members add column hide_given_doses boolean not null default false;

-- The existing pet_members_update policy only lets *owners* update a row (it
-- governs role/membership management). Every caregiver/viewer now also needs
-- to update their own row, but only its new preference columns — never role,
-- pet_id, user_id, or invited_by, which would otherwise let anyone hand
-- themselves ownership via a raw PostgREST update. RLS policies can't
-- restrict by column, so this pins those columns back to their prior values
-- on any update performed by someone who isn't an owner of the pet.
create or replace function protect_pet_members_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_pet_member(old.pet_id, 'owner') then
    new.pet_id := old.pet_id;
    new.user_id := old.user_id;
    new.role := old.role;
    new.invited_by := old.invited_by;
    new.joined_at := old.joined_at;
  end if;
  return new;
end;
$$;

create trigger protect_pet_members_privileged_columns_trigger
  before update on pet_members
  for each row execute function protect_pet_members_privileged_columns();

create policy pet_members_update_own on pet_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
