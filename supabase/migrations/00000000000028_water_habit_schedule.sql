-- Extends habit_schedules (00000000000020) to cover water refills too, so
-- water's overdue check can be schedule-driven the same way walk/food
-- already are, instead of a fixed hours-since-last-log guess. Also adds the
-- matching per-caregiver push toggle, mirroring notify_walk_due/notify_food_due
-- (00000000000021_notification_preferences.sql).

alter table habit_schedules drop constraint habit_schedules_type_check;
alter table habit_schedules add constraint habit_schedules_type_check check (type in ('walk', 'food', 'water'));

alter table pet_members add column notify_water_due boolean not null default true;
