-- Weight is one of the earliest signals of a geriatric condition worsening.
-- It reuses the habit_logs infrastructure (same table, history, editing)
-- rather than a dedicated table, since structurally it's just another kind
-- of dated observation about the dog.

alter type habit_type add value 'weight';
