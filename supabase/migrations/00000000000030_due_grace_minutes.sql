-- A caregiver logging something right at (or a minute past) its due time
-- shouldn't immediately see the same red "overdue" treatment as something
-- genuinely missed for hours. This is the grace window — in the app, an item
-- shows a neutral "due" state (not yet overdue) for this many minutes past
-- its scheduled/due time before flipping to overdue. Per pet since
-- households vary in how tightly they want to be held to a schedule;
-- editable alongside the rest of a pet's schedule settings.

alter table pets add column due_grace_minutes integer not null default 10 check (due_grace_minutes >= 0 and due_grace_minutes <= 120);
