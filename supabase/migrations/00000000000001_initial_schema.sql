-- GeriPaws initial schema
-- Pet-scoped multi-tenancy: every pet-scoped table is protected by RLS keyed
-- off pet_members via the is_pet_member() security-definer helper below.

create type pet_role as enum ('owner', 'caregiver', 'viewer');
create type pet_status as enum ('active', 'passed');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type habit_type as enum ('walk', 'water', 'food', 'incident');
create type ailment_status as enum ('active', 'monitoring', 'resolved');
create type vet_question_status as enum ('open', 'answered');

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------
create table pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null default 'dog' check (species = 'dog'),
  breed text,
  dob date,
  sex text,
  weight_unit text not null default 'lb' check (weight_unit in ('lb', 'kg')),
  photo_url text,
  status pet_status not null default 'active',
  day_boundary_hour smallint not null default 0 check (day_boundary_hour between 0 and 23),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pet_members — the sharing / multi-tenancy boundary
-- ---------------------------------------------------------------------------
create table pet_members (
  pet_id uuid not null references pets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role pet_role not null,
  invited_by uuid references auth.users (id),
  joined_at timestamptz not null default now(),
  primary key (pet_id, user_id)
);

create index pet_members_user_id_idx on pet_members (user_id);

-- Security-definer helper: routes every RLS membership/role check through
-- one function instead of inlining a subquery on pet_members in each policy,
-- which avoids the classic Postgres RLS recursion trap (a policy on
-- pet_members that queries pet_members to evaluate itself).
create or replace function is_pet_member(target_pet_id uuid, min_role pet_role default 'viewer')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from pet_members pm
    where pm.pet_id = target_pet_id
      and pm.user_id = auth.uid()
      and (
        min_role = 'viewer'
        or (min_role = 'caregiver' and pm.role in ('caregiver', 'owner'))
        or (min_role = 'owner' and pm.role = 'owner')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- pet_invites
-- ---------------------------------------------------------------------------
create table pet_invites (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  email text not null,
  role pet_role not null,
  token uuid not null default gen_random_uuid(),
  status invite_status not null default 'pending',
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index pet_invites_pet_id_idx on pet_invites (pet_id);
create unique index pet_invites_token_idx on pet_invites (token);

-- ---------------------------------------------------------------------------
-- habit_logs
-- ---------------------------------------------------------------------------
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  type habit_type not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  logged_by uuid not null references auth.users (id),
  details jsonb not null default '{}'::jsonb,
  photo_url text
);

create index habit_logs_pet_id_occurred_at_idx on habit_logs (pet_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- ailments
-- ---------------------------------------------------------------------------
create table ailments (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  name text not null,
  diagnosed_at date,
  diagnosing_vet text,
  status ailment_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ailments_pet_id_idx on ailments (pet_id);

-- ---------------------------------------------------------------------------
-- medications (ailment_id nullable — the "General / Wellness" catch-all for
-- supplements/joint chews not tied to a diagnosed condition)
-- ---------------------------------------------------------------------------
create table medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  ailment_id uuid references ailments (id) on delete set null,
  name text not null,
  dosage text not null,
  unit text not null,
  route text,
  schedule jsonb not null default '{}'::jsonb,
  active_from date not null default current_date,
  active_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medications_pet_id_idx on medications (pet_id);
create index medications_ailment_id_idx on medications (ailment_id);

-- ---------------------------------------------------------------------------
-- medication_doses — what the habit tracker's medication checklist reads/writes
-- ---------------------------------------------------------------------------
create table medication_doses (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  medication_id uuid not null references medications (id) on delete cascade,
  scheduled_at timestamptz not null,
  given_at timestamptz,
  created_at timestamptz not null default now(),
  given_by uuid references auth.users (id),
  skipped boolean not null default false,
  notes text
);

create index medication_doses_medication_id_scheduled_at_idx
  on medication_doses (medication_id, scheduled_at desc);
create index medication_doses_pet_id_idx on medication_doses (pet_id);

-- ---------------------------------------------------------------------------
-- medication_refills — run-out date is computed in application code from
-- count_on_hand + the medication's schedule, not stored here
-- ---------------------------------------------------------------------------
create table medication_refills (
  medication_id uuid primary key references medications (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  count_on_hand numeric not null default 0,
  unit_per_dose numeric not null default 1,
  low_stock_threshold numeric not null default 7,
  last_updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ailment_notes — condition-change log
-- ---------------------------------------------------------------------------
create table ailment_notes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  ailment_id uuid not null references ailments (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  note text not null,
  created_by uuid not null references auth.users (id)
);

create index ailment_notes_ailment_id_idx on ailment_notes (ailment_id);
create index ailment_notes_pet_id_idx on ailment_notes (pet_id);

-- ---------------------------------------------------------------------------
-- vet_questions
-- ---------------------------------------------------------------------------
create table vet_questions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  ailment_id uuid not null references ailments (id) on delete cascade,
  question text not null,
  status vet_question_status not null default 'open',
  answer text,
  asked_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index vet_questions_ailment_id_idx on vet_questions (ailment_id);
create index vet_questions_pet_id_idx on vet_questions (pet_id);

-- ---------------------------------------------------------------------------
-- qol_responses
-- ---------------------------------------------------------------------------
create table qol_responses (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  survey_date date not null default current_date,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  answered_by uuid not null references auth.users (id),
  scores jsonb not null,
  total_score numeric not null,
  notes text
);

create index qol_responses_pet_id_survey_date_idx on qol_responses (pet_id, survey_date desc);
