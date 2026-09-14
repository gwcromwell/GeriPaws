-- Extends the send-reminders dedup log (00000000000004_notification_log.sql)
-- so overdue walks and overdue food can be logged/deduped the same way
-- overdue medications already are, now that habit_schedules
-- (00000000000020) gives walk/food something to be "overdue" against.

alter type notification_kind add value 'walk_overdue';
alter type notification_kind add value 'food_overdue';
