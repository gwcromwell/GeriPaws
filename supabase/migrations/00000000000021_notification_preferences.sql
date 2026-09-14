-- Per-caregiver, per-dog push notification preferences: which "due" events
-- (medication/walk/food) push this member, and whether they want a push when
-- someone else records an item for this dog. Lives on pet_members for the
-- same reason as the Today-screen display preferences added in
-- 00000000000013_member_preferences.sql — personal to "how I want to be
-- notified about this dog", and different caregivers of the same pet may
-- reasonably want different settings. That migration's
-- pet_members_update_own policy and protect_pet_members_privileged_columns
-- trigger already let any member update their own row's non-privileged
-- columns, so these new columns need no additional RLS or trigger work.

alter table pet_members add column notify_medication_due boolean not null default true;
alter table pet_members add column notify_walk_due boolean not null default true;
alter table pet_members add column notify_food_due boolean not null default true;
alter table pet_members add column notify_completed_by_others boolean not null default true;
