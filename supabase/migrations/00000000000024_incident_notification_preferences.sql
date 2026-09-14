-- Per-caregiver, per-dog incident notification preferences: which incident
-- categories (habit_logs.details->>'category', see IncidentCategory in
-- packages/shared/src/types.ts) trigger a "someone else logged this" push
-- for this member. Kept separate from notify_completed_by_others
-- (00000000000021, which covers walk/water/food/medication) because
-- incidents vary enormously in urgency — a caregiver may want a push for a
-- seizure but not for a urine accident. Defaults to every category, matching
-- this feature's opt-out-rather-than-opt-in default elsewhere; an empty
-- array means no incident notifications at all.

alter table pet_members add column notify_incident_categories text[] not null
  default array['urine', 'stool', 'vomit', 'fall', 'seizure', 'disorientation', 'other'];

alter table pet_members add constraint pet_members_notify_incident_categories_valid
  check (notify_incident_categories <@ array['urine', 'stool', 'vomit', 'fall', 'seizure', 'disorientation', 'other']::text[]);
