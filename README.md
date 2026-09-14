# GeriPaws

A multiuser habit, ailment, and quality-of-life tracker for geriatric dogs — one
codebase that ships as both an iPhone app and a webapp. Multiple caregivers
(e.g. you and your spouse) can share a single dog, while a completely separate
household sharing their own dog never sees your data.

Canine-only for now. Built for personal/family use first, architected so it
could be opened up publicly later without a rewrite.

## Status

| Phase | What it covers | Status |
| --- | --- | --- |
| 0 | Auth, dog profiles, sharing/invites, Supabase schema + RLS | ✅ Done |
| 1 | Daily habit tracker: walk/water/food/incident logging, history, editing | ✅ Done |
| 2 | Ailments, medications, schedules, refill tracking | ✅ Done |
| 3 | Quality of Life check-ins (HHHHHMM scale), email reminders | ✅ Done |
| 4 | Native iOS build (App Store), real push notifications | ✅ Shipped to TestFlight — see below |
| 5 | Weight tracking, condition templates, vet share links, combined timeline | ✅ Partially done — see below |
| 6 | Walk/food schedules per dog, due & completion push notifications | ✅ Done — see below |

## Tech stack

- **App**: [Expo Router](https://docs.expo.dev/router/introduction/) (React
  Native + `react-native-web`) — one codebase targets iOS and the web.
- **Backend**: [Supabase](https://supabase.com) — Postgres with Row Level
  Security for multi-tenancy, Auth, and Edge Functions for scheduled jobs.
- **Monorepo**: pnpm workspaces.
- **Language**: TypeScript throughout, including the Deno-based Edge Function.

## Repo structure

```
apps/geripaws-app/       Expo Router app (mobile + web)
packages/shared/         Shared types, zod schemas, and pure business logic
                          (medication schedule math, refill projection, QOL
                          scoring, timezone handling) — used by the app and
                          mirrored into the Edge Function below.
supabase/migrations/     SQL migrations, applied in order via the Supabase
                          SQL Editor (see "Database setup").
supabase/functions/      Edge Functions:
                          - send-reminders: hourly job emailing/pushing
                            caregivers about overdue medications, overdue
                            walks/food (habit_schedules), low refills, and
                            overdue QOL check-ins — filtered per recipient by
                            their own notification preferences.
                          - notify-completion: fired by a DB trigger the
                            moment a habit is logged or a medication dose is
                            given, pushing the rest of the household near-
                            real-time ("Amanda gave Kenobi's Keppra").
                          - get-shared-pet: public (no auth), read-only
                            endpoint behind a vet share-link token.
```

## Getting started

**Prerequisites**: Node 22 (see `.nvmrc`), pnpm (via `corepack enable pnpm`).

```bash
pnpm install
```

Copy the env template and fill in your Supabase project's URL and anon key
(Supabase dashboard → Settings → API):

```bash
cp apps/geripaws-app/.env.example apps/geripaws-app/.env
```

Run it:

```bash
pnpm web    # or: pnpm --filter geripaws-app ios
```

## Database setup

Run the files in `supabase/migrations/` **in order** via the Supabase
dashboard's SQL Editor (they're numbered; there's no CLI-based migration
runner wired up yet, so apply them manually).

### Reminders Edge Function

`supabase/functions/send-reminders` needs:

1. A `RESEND_API_KEY` secret (Supabase dashboard → Edge Functions → Manage
   secrets) — used to send reminder emails via [Resend](https://resend.com).
   The sending domain is hardcoded in the function (`FROM_EMAIL`); update it
   if you're not using `obi1.nyc`.
2. Deployed via the Supabase CLI (the dashboard's browser-based function
   editor has repeatedly mis-bundled this file — CLI deploy is the reliable
   path):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy send-reminders
   ```
3. An hourly cron schedule, set up by running
   `supabase/migrations/00000000000005_reminders_cron.sql` in the SQL Editor
   **after** the function is deployed (it references the function's URL).

### Pet-invite Edge Function

`supabase/functions/send-pet-invite` emails the invite link when someone
shares a pet (uses the same `RESEND_API_KEY` secret as reminders). It
**must** be deployed with JWT verification disabled at the gateway, even
though it checks the caller's session itself in code:

```bash
npx supabase functions deploy send-pet-invite --no-verify-jwt
```

Without `--no-verify-jwt`, the Supabase gateway rejects the browser's CORS
preflight `OPTIONS` request (it never carries an `Authorization` header) with
401 `Missing Authorization header` — before the request ever reaches this
function's own `handleRequest`, which never sees a chance to answer the
preflight. This makes web invites fail with "the email couldn't be sent"
regardless of anything the function code does; the fix is the deploy flag,
not the code. (`get-shared-pet` below hits the same class of issue for the
same reason.)

## Phase 4: native iOS build + push notifications

Both accounts this phase needs are set up and in use:

- **Apple Developer Program** (Individual enrollment) — bundle id
  `nyc.obi1.geripaws`, App Store Connect app id `6810824731` (see
  `eas.json`'s `submit.production.ios.ascAppId`).
- **Expo/EAS account** (`obione`) — EAS project id is in
  `app.json`'s `extra.eas.projectId`.

The app has shipped to TestFlight multiple times via the production profile:

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production --latest
```

(`npx eas build:list` / `npx eas submit:list` show the full history.) Each
submission bumps the build number automatically (`autoIncrement: true` in
`eas.json`); the App Store-facing version (`app.json`'s `expo.version`) is
bumped manually when it's actually time for a version bump, not every build.

A `development`-profile build (`npx eas build --platform ios --profile
development`) is also available for installing a debug client on a physical
device without going through TestFlight.

The account-independent pieces that make this all work:

- `push_tokens` table (`supabase/migrations/00000000000007_push_tokens.sql`)
  — one row per device per user, RLS-locked to that user only.
- `expo-notifications` installed and configured (`app.json` plugin entry,
  `ios.bundleIdentifier: "nyc.obi1.geripaws"`, background remote-notification
  mode).
- `src/lib/push.ts` — requests permission, gets the Expo push token, and
  saves it to `push_tokens`. Registered once on entering the authenticated
  app (`(app)/_layout.tsx`). No-ops safely (no crash, just a console warning)
  on the Simulator or before `extra.eas.projectId` exists.
- `supabase/functions/send-reminders` already sends push notifications
  alongside email wherever tokens exist for a pet's caregivers — same
  overdue-medication/overdue-walk/overdue-food/low-refill/overdue-QOL
  triggers, same once-per-day dedup, now filtered per recipient by that
  caregiver's own notification preferences (`pet_members.notify_*_due` —
  see `pets/[id]/preferences.tsx`; the email digest stays unfiltered).
- `src/lib/due-notifications.ts` schedules **on-device, exact-time** local
  notifications for "X is due" (e.g. Kenobi's 8pm Keppra), separately from
  the hourly server digest above — these fire at the precise scheduled
  moment rather than up to an hour late. Recomputed on entering the app and
  whenever it's foregrounded (`(app)/_layout.tsx`'s `AppState` listener),
  since this app has no reliable background refresh; "today's due times"
  are only as fresh as the last time it was opened.
- `supabase/functions/notify-completion` pushes the rest of a pet's
  household the moment someone logs a habit or gives a medication dose
  ("Amanda gave Kenobi's Keppra"), gated per recipient by
  `pet_members.notify_completed_by_others`. Fired by a DB trigger (
  `00000000000023_notify_completion_trigger.sql`) via `pg_net`, the same
  mechanism the hourly cron job uses to call an Edge Function from SQL —
  just triggered by a row event instead of a schedule. Deployed the same
  way as `send-reminders` (no `--no-verify-jwt` needed — it's only ever
  called by that trigger with the anon key, never from a browser, so there's
  no CORS preflight to satisfy):
  ```bash
  npx supabase functions deploy notify-completion
  ```
- `eas.json` — development/preview/production build profiles.

What's still open: independently confirming, on a real installed device,
that a push notification is actually delivered end-to-end (the notification
logic itself — overdue digest, exact-time due reminders, completion pushes —
is functionally complete and deployed). Each new TestFlight build also only
covers whatever was on `main` at build time — check `eas build:list`'s
`Commit` column against `git log` if you need to confirm a specific change
made it into what's currently in testers' hands.

## Phase 5: weight tracking, condition templates, vet share links, combined timeline

Billing/subscriptions and the memorial/archive state (both originally scoped
for Phase 5) are deferred — not urgent for personal use, and billing is
awkward to build before Phase 4's native app exists anyway. What's done:

- **Weight tracking** — reuses the habit_logs infrastructure (a new `weight`
  value on the `habit_type` enum) rather than a dedicated table, since
  structurally it's just another dated observation. Own screen
  (`pets/[id]/weight.tsx`) with a trend chart; also appears in History's
  Weight tab and the Today screen.
- **Condition templates** — `src/lib/condition-templates.ts` pre-fills a
  condition's name and general monitoring notes when adding an ailment.
  Deliberately never suggests specific drugs or dosages — that stays the
  vet's call, entered manually in the Medications form.
- **Vet share links** — `pet_share_links` table (owner-only via RLS) plus the
  public `get-shared-pet` Edge Function and a public `/shared/[token]` page
  (outside the authenticated route group). A vet with the link sees active
  conditions, current medications, and QOL/weight trends — no GeriPaws
  account needed. Links are time-limited (30 days by default) and revocable
  from the Ailments screen's "Share with your vet" section (owners only).
- **Combined timeline** — History gained a "Timeline" tab
  (`src/lib/timeline.ts`) that merges habit logs, medication doses, QOL
  check-ins, and ailment notes into one chronologically sorted feed, so
  patterns across categories are visible at a glance. The type-specific tabs
  (Walk, Meds, etc.) are unchanged for focused views.

`get-shared-pet` needs the same CLI deploy as `send-reminders`, but **must**
be deployed with JWT verification disabled, since a vet with the link has no
Supabase session at all:

```bash
npx supabase functions deploy get-shared-pet --no-verify-jwt
```

And its migration, like the others, is applied via the SQL Editor:
`supabase/migrations/00000000000009_pet_share_links.sql` (weight tracking's
enum addition is `00000000000008_weight_tracking.sql`).

## Phase 6: walk/food schedules + due & completion notifications

- **Walk/food schedules** — `habit_schedules` table
  (`00000000000020_habit_schedules.sql`), one row per `(pet_id, type)` for
  `walk`/`food`, reusing the same schedule shape as medications (fixed
  times/day, every N hours, or specific days — never "as needed", since a
  walk or a meal is always expected once scheduled). Editable per dog from
  the pet detail screen's "Schedule" link (`pets/[id]/schedule.tsx`), so a
  multi-dog household can give each dog different times. Absence of a row
  for a pet/type means no schedule is set — overdue checks simply skip it.
  The schedule-kind picker UI (`src/components/schedule-editor.tsx`) is
  shared with the medication form, which used to have its own inline copy.
- **Notification preferences** — four booleans on `pet_members`
  (`00000000000021_notification_preferences.sql`): `notify_medication_due`,
  `notify_walk_due`, `notify_food_due`, `notify_completed_by_others`. Personal
  per caregiver *and* per dog — Amanda and Greg can each choose differently
  for Kenobi, and differently again for another shared dog. Editable from
  `pets/[id]/preferences.tsx` alongside the existing Today-screen tile
  preferences.
- **Due notifications** and **completion notifications** — see the Phase 4
  section above for `due-notifications.ts` and `notify-completion`.

## Architecture notes

- **Multi-tenancy**: every pet-scoped table is protected by Postgres RLS keyed
  off the `pet_members` join table via an `is_pet_member()` security-definer
  function (see `supabase/migrations/00000000000002_rls_policies.sql`). A
  new pet's creator becomes its owner via an `AFTER INSERT` trigger.
- **Timezones**: medication schedule times (`"08:00"`) are only meaningful
  relative to a timezone. Each pet stores an IANA timezone (captured
  automatically from the creating device), and both the app and the
  server-side reminders function use the same timezone-aware date math
  (`packages/shared/src/tz.ts`) to interpret them identically regardless of
  where the code runs — client device or server, whatever timezone each is
  physically in.
- **Shared business logic**: anything that needs to produce the *same*
  answer on both the client and the reminders Edge Function (due-dose
  computation, refill run-out projection, QOL scoring) lives in
  `packages/shared` as pure functions. The Edge Function duplicates a copy of
  this logic rather than importing it, since Edge Functions deploy as a
  single self-contained file — keep the two in sync if you change either.

## Known gaps / not yet built

- Push notification delivery hasn't been independently confirmed on a real
  installed device — the logic (overdue digest, exact-time due reminders,
  completion pushes) is functionally complete and shipped in a TestFlight
  build, but nobody's verified a push actually arrives end-to-end yet.
- No vet-visit summary export, subscriptions/billing, or memorial/archive
  state for a pet's passing (deferred Phase 5 items).
- Editing a medication doesn't support reassigning it to a different
  condition (dose/schedule/refill fields only).
- Restocking a medication sets an absolute new count rather than "add N."
- Vet share links display a proper copyable URL on web (using the page's own
  origin), but native has no fixed production web domain to build one from
  yet — copy/share on native shows a placeholder path until that's decided.
