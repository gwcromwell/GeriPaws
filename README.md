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
| 4 | Native iOS build (App Store), real push notifications | 🚧 In progress |
| 5 | Weight tracking, condition templates, vet share links, combined timeline | ✅ Partially done — see below |

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
                            caregivers about overdue medications, low
                            refills, and overdue QOL check-ins.
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

## Phase 4: native iOS build + push notifications

Requires two accounts that don't exist yet as of this writing:

- **Apple Developer Program** (developer.apple.com/programs/enroll, $99/year,
  Individual enrollment) — needed to build a real device binary, get push
  notifications working, and submit to TestFlight/the App Store.
- **Expo/EAS account** (expo.dev/signup, free) — handles building and
  submitting the iOS app.

Once both exist:

```bash
npx eas login
npx eas build:configure          # links the project, fills in extra.eas.projectId
npx eas build --platform ios --profile development
```

The app already has the account-independent pieces in place:

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
  overdue-medication/low-refill/overdue-QOL triggers, same once-per-day
  dedup. Nothing else to wire up once a real device is registered.
- `eas.json` — development/preview/production build profiles.

What's still blocked on the accounts above: actually running `eas build`,
installing on a physical device, and confirming a push notification is
delivered end-to-end.

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

- No native iOS binary yet — push notification groundwork (Phase 4) is in
  place, but delivering a real push requires an Apple Developer account, an
  EAS build, and installing on a physical device (none of which exist yet).
- No vet-visit summary export, subscriptions/billing, or memorial/archive
  state for a pet's passing (deferred Phase 5 items).
- Editing a medication doesn't support reassigning it to a different
  condition (dose/schedule/refill fields only).
- Restocking a medication sets an absolute new count rather than "add N."
- Vet share links display a proper copyable URL on web (using the page's own
  origin), but native has no fixed production web domain to build one from
  yet — copy/share on native shows a placeholder path until that's decided.
