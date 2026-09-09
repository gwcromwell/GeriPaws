-- Quality of Life is an emotionally loaded metric for some caregivers — this
-- lets them keep tracking it (for trends, the vet-visit summary, etc.)
-- without it surfacing passively on the Today screen every time they open
-- the app. Defaults to hidden; showing it is an explicit opt-in.

alter table qol_settings add column show_on_today boolean not null default false;
