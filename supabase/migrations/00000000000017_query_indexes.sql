-- Composite indexes backing query shapes that were only partially covered by
-- existing single-column indexes. None of these replace an existing index —
-- some queries filter by type/status and some don't, so both shapes are kept.

-- fetchLatestByType/fetchHabitLogs filter by (pet_id, type) then order by
-- occurred_at — the existing habit_logs_pet_id_occurred_at_idx doesn't
-- include type, so a type-filtered query can't use it efficiently.
create index habit_logs_pet_id_type_occurred_at_idx on habit_logs (pet_id, type, occurred_at desc);

-- fetchDosesSince filters by (pet_id, scheduled_at) on every Today-screen
-- load — the existing medication_doses_pet_id_idx is pet_id-only.
create index medication_doses_pet_id_scheduled_at_idx on medication_doses (pet_id, scheduled_at);

-- fetchPendingInvites filters by (pet_id, status).
create index pet_invites_pet_id_status_idx on pet_invites (pet_id, status);

-- fetchAilments filters by pet_id and orders by status — a covering index
-- lets both the filter and the sort use the same index.
create index ailments_pet_id_status_idx on ailments (pet_id, status);
