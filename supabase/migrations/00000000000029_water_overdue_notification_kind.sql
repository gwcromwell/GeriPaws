-- Extends the send-reminders dedup log (00000000000004_notification_log.sql)
-- so overdue water refills can be logged/deduped the same way overdue
-- walks/food already are (00000000000022_habit_overdue_notification_kinds.sql),
-- now that habit_schedules (00000000000028) lets water have a schedule to be
-- "overdue" against. Kept in its own file/transaction — Postgres won't let a
-- new enum value be used in the same transaction that adds it.

alter type notification_kind add value 'water_overdue';
