# Plan 006: Design spike — first booking surface (signer create + interpreter pool)

> **Executor instructions**: This is a **design/spike plan**, not a build-
> everything plan. Its deliverable is (a) a short design doc committed to the
> repo and (b) a thin, working vertical slice that proves the data path. Do NOT
> attempt the full spec'd booking product. Follow the steps; where a step says
> "decide and document," record the decision in the design doc rather than
> guessing silently. Honor STOP conditions. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 10e1b19..HEAD -- supabase/migrations apps/web/app`
> If migrations or app routes changed since this plan was written, re-read the
> relevant files before proceeding.

## Status

- **Priority**: P2
- **Effort**: L (spike is M; the full surface beyond the spike is L+ and out of
  scope here)
- **Depends on**: 001 (secures the identity table these bookings reference);
  benefits from 002 (so the slice is testable)
- **Category**: direction
- **Planned at**: commit `10e1b19`, 2026-06-12

## Why this matters

WaveTap's schema already defines `bookings`, `booking_interests`, and
`booking_confirmations` — with full RLS — but **no UI touches any of them.** The
product (a marketplace where Signers post interpreting jobs and Interpreters pick
them up) does not yet exist in the app; only auth + onboarding do. This is the
single highest-value direction: the data model is paid for, the surfaces aren't
built. Booking-creation without a pool to see them is a one-way street, so the
first meaningful slice is **both**: a Signer can create a booking, and an
Interpreter can see open bookings in a pool. This spike de-risks the build by
proving the create→read path end-to-end against the live RLS, surfacing the real
open questions (location privacy, distance filtering, slots UX) before a large
build commits to answers.

## Current state (what exists to build on)

- **Schema is ready.** `supabase/migrations/20260603220659_initial_schema.sql`:
  - `bookings` (lines 98-119): `signer_id`, `title`, `description`,
    `booking_date date`, `start_time time`, `end_time time`, `mode in
    ('in_person','remote')`, `location_*` (suburb/postcode/state/lat/lng),
    `slots jsonb` (default `[{"kind":"any"}]`, 1-10 elements, each `kind` is
    `"any"` or `"deaf"` per the mixed-team ADR), `notes`, `status in
    ('open','pending','confirmed','expired','cancelled')` default `'open'`.
  - Indexes on status, date, mode, `(location_lat, location_lng)`, signer.
  - RLS (lines 313-345):
    - `bookings_insert_own`: `with check (signer_id = auth.uid())` — a signer
      creates their own booking.
    - `bookings_select_own_signer`: signer reads their own.
    - `bookings_select_open`: **any authenticated user reads any `status='open'`
      booking** — this is the pool read path. ⚠️ See Open Question 1.
    - `bookings_select_involved`: interpreters read bookings they've expressed
      interest in / been confirmed for.
  - Grant: `select, insert, update, delete on bookings to authenticated` (line 439).
- **No booking routes exist.** `apps/web/app/` has only landing, login, auth,
  onboarding, home. Spec routes `/bookings/new`, `/bookings/[id]`, `/pool`,
  `/pool/[id]` (in `11_ROUTES_AND_PAGES.md`) are unbuilt.
- **Spec to read**: `03_BOOKING_FLOW.md` (the full Wave→Tap→Book flow),
  `11_ROUTES_AND_PAGES.md` (route map), `06_AUTH_SECURITY_PRIVACY.md` (the rule
  that exact location / contact must not leak — load-bearing for OQ1).
- **Conventions to match** (study these before writing UI):
  - Server actions: `apps/web/app/*/actions.ts` with `"use server"`, return
    `{ error: string }` on failure, `redirect()` on success.
  - Data access in RSC/actions via `createClient()` from `@/lib/supabase/server`;
    typed by `@wavetap/api`'s `Database`.
  - Auth gate: `requireUser()` from `@/lib/auth/profile.ts` at the top of authed
    pages; `userHasProfile` redirect pattern (see `app/home/page.tsx`).
  - Forms: client components using HeroUI v3 (`onPress` not `onClick`), `motion`
    for entrance, inline `{error}` chips. Model after
    `apps/web/app/onboarding/profile/profile-form.tsx`.
  - Pure domain helpers live in `packages/core/src/index.ts` (already has `Slot`,
    `MIN_SLOTS`/`MAX_SLOTS`, `isCompositionSatisfied`) — reuse, don't re-derive.
  - Tokens: semantic classes (`text-foreground`, `text-muted`), no literal hex.

## Deliverables of THIS spike

1. **A design doc** at `docs/design/booking-surface.md` (create the dir) that
   resolves the open questions below with a recommendation each, and sketches the
   full route map + component breakdown for the eventual build.
2. **A thin vertical slice** proving the path:
   - `/bookings/new` — a minimal create form (title, date, start time, mode; for
     `in_person`, suburb/postcode) → `bookings` insert with `status='open'`,
     `slots` defaulting to `[{"kind":"any"}]`. Redirect to `/bookings/[id]`.
   - `/bookings/[id]` — signer's read-only view of their booking.
   - `/pool` — list of open bookings the current user can see (uses
     `bookings_select_open`), each linking to a read-only `/pool/[id]`.
   - This is enough to prove create→store→read across two roles. **Interest /
     selection / confirmation / notifications are explicitly out of scope** for
     the spike (they're plans of their own).

## Open questions to resolve in the design doc (do not silently guess)

1. **Location privacy on the pool (load-bearing).** `bookings_select_open` exposes
   the *full* bookings row — including `location_lat/lng`, exact suburb/postcode,
   and `notes` — to *every* authenticated user (including other signers, and
   interpreters who haven't been selected). `06_AUTH_SECURITY_PRIVACY.md` says
   exact location must not be broadly exposed. **Recommend**: a `public_bookings`
   view (mirroring the existing `public_profiles` pattern at migration line 244+)
   that exposes only coarse fields (suburb + state, approximate distance bucket,
   mode, date, title) and have the pool read the view, not the table — with the
   table's open-select policy tightened or the view used exclusively. Decide and
   document; if it needs a migration, scope it as a follow-up plan (don't build it
   blind in the spike — but DO flag it as a launch blocker for the pool).
2. **Distance filtering.** Interpreters have `working_radius_km`; bookings have
   lat/lng. Options: (a) app-side haversine filter after fetching open bookings
   (fine at low volume, O(n)); (b) a Postgres function using earth-distance /
   PostGIS `ST_DWithin` with a spatial index (scales, more work). **Recommend**
   (a) for the spike + early launch, with (b) noted as the scale path. The current
   `(location_lat, location_lng)` B-tree index does NOT accelerate radius queries —
   document that a GIST/geography index is the eventual need.
3. **Slots / team composition UX.** Schema supports 1-10 slots each `any|deaf`.
   For the spike, default to a single `{"kind":"any"}` slot and DON'T build the
   multi-slot editor — but document the intended UX (stepper + per-slot kind
   toggle) for the full build, referencing `isCompositionSatisfied` in
   `packages/core`.
4. **Time zones.** `booking_date`/`start_time` are naive date/time. Document the
   assumption (Australia local time; which TZ — per-booking suburb, or a single
   AU TZ?) so the pool and notifications interpret them consistently.

## Commands you will need

| Purpose | How | Expected |
|---|---|---|
| Read schema/specs | Read tool on the files cited above | — |
| Typecheck | `pnpm typecheck` | exit 0 |
| Build | `pnpm --filter @wavetap/web build` | exit 0, new routes listed |
| Dev (manual check) | `pnpm web` then visit `/bookings/new`, `/pool` | renders |
| Apply any migration | Supabase MCP `apply_migration` | success |
| Regenerate types | Supabase MCP `generate_typescript_types` | — |

## Scope

**In scope**:
- `docs/design/booking-surface.md` (create — the design doc + resolved OQs)
- `apps/web/app/bookings/new/page.tsx` + `new/booking-form.tsx` + `bookings/actions.ts`
- `apps/web/app/bookings/[id]/page.tsx`
- `apps/web/app/pool/page.tsx` + `pool/[id]/page.tsx`
- A booking-domain helper in `packages/core/src/index.ts` if pure logic is needed
  (e.g. a haversine distance fn) — extend the existing file.
- Tests for any pure helper added (if plan 002 landed).
- `plans/README.md` (status update)

**Out of scope** (these are future plans, NOT this spike — do not build them):
- Express-interest, signer selection, confirmation, contact exchange.
- Notifications / Edge Functions.
- The `public_bookings` privacy view migration (scope it as a follow-up; flag,
  don't build blind) UNLESS resolving OQ1 makes it trivial and the maintainer
  okays it — default is to document and defer.
- Multi-slot team composition editor.
- Edit/cancel booking flows beyond create + read.
- Any mobile work.

## Git workflow

- Branch: `advisor/006-booking-spike`
- Commits: design doc first; then the slice (create path, then read/pool path).
  Plain subjects, **no AI-attribution trailers**.
- Do NOT push / open a PR unless instructed.

## Steps

### Step 1: Read and write the design doc

Read `03_BOOKING_FLOW.md`, `11_ROUTES_AND_PAGES.md`, `06_AUTH_SECURITY_PRIVACY.md`,
the `bookings` schema + RLS, and `packages/core/src/index.ts`. Write
`docs/design/booking-surface.md` containing: the four resolved open questions
(each with a recommendation + rationale), the full eventual route map, the
component breakdown, and an explicit "spike scope vs full build" boundary.

**Verify**: file exists and addresses all four OQs.

### Step 2: Build the create path

Create the `/bookings/new` form (client component, HeroUI v3, model after
`onboarding/profile/profile-form.tsx`) and `bookings/actions.ts` with a
`createBooking` server action:
- `requireUser()` first.
- validate: title non-empty, date present, start time present, mode valid; if
  `in_person`, require suburb or postcode (mirror the onboarding validation
  style and messages).
- geocode `in_person` locations best-effort via the existing
  `geocodeAU` (`@/lib/geocode`) — reuse, don't re-implement.
- insert into `bookings` with `signer_id: user.id`, `status: 'open'`,
  `slots: [{ kind: 'any' }]`.
- `redirect(\`/bookings/${data.id}\`)` on success; `{ error }` on failure.

**Verify**: `pnpm typecheck` → 0; `pnpm --filter @wavetap/web build` → 0 with the
new route listed. Manual: `pnpm web`, sign in, create a booking, land on its detail
page. Confirm via Supabase MCP `execute_sql` (`select id, title, status from
bookings order by created_at desc limit 1`) that the row exists with `status='open'`.

### Step 3: Build the read + pool path

- `/bookings/[id]`: RSC, `requireUser()`, fetch the booking by id (RLS lets the
  signer read their own), render read-only. 404/redirect if not found.
- `/pool`: RSC, `requireUser()`, fetch open bookings (`status='open'`) — for the
  spike, read the table directly via the `bookings_select_open` policy, BUT add a
  prominent `// TODO(privacy): read via public_bookings view — see OQ1` comment so
  the privacy gap isn't forgotten. List title/suburb/date/mode, each linking to
  `/pool/[id]` (read-only detail, same coarse fields).

**Verify**: `pnpm typecheck` → 0; build → 0. Manual: as a second user (or the same
user), `/pool` shows the booking created in Step 2; `/pool/[id]` opens it.

### Step 4: Distance helper + test (optional, if time/plan-002 allow)

If implementing OQ2 option (a), add a pure `haversineKm(a, b)` to
`packages/core/src/index.ts` and a unit test (if vitest exists from plan 002).
Do NOT wire complex filtering UI in the spike — a helper + test is enough to prove
the approach.

**Verify**: `pnpm test` → pass.

## Test plan

- Spike-level: the manual create→read→pool walkthrough in Steps 2-3 is the primary
  proof. Record the steps you ran in the design doc's "verified" section.
- If plan 002 landed: unit-test any pure helper added to `packages/core`
  (haversine, slot validation reuse). Pattern: Vitest in `packages/core`.
- Full E2E is deferred to the real build, not the spike.

## Done criteria

ALL must hold:
- [ ] `docs/design/booking-surface.md` exists and resolves all four open questions with recommendations.
- [ ] `/bookings/new` creates a `status='open'` booking (confirmed via SQL select).
- [ ] `/bookings/[id]` renders the signer's booking; `/pool` lists open bookings; `/pool/[id]` opens one.
- [ ] `pool/page.tsx` contains the `TODO(privacy)` marker referencing OQ1.
- [ ] `pnpm typecheck` exits 0; `pnpm --filter @wavetap/web build` exits 0 with the 4 new routes.
- [ ] Out-of-scope features (interest/selection/notifications/multi-slot) are NOT built.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report (do not improvise) if:
- Plan 001 has not landed — the `profiles` table (referenced by `bookings.signer_id`)
  is still wide open; flag before adding booking data, or proceed and note it.
- Resolving OQ1 reveals the open-select RLS policy leaks data you're not
  comfortable shipping even behind a TODO — STOP and propose the `public_bookings`
  view as a prerequisite plan instead of building the pool against the raw table.
- The `bookings` schema differs from the "Current state" excerpt (drifted).
- The spike starts ballooning toward the full product (you find yourself building
  interest/selection) — STOP; that's a separate plan. The spike's job is to prove
  the path and surface the questions, not ship the marketplace.

## Maintenance notes

- **OQ1 is a launch blocker for the pool**, not just a nicety — exact location +
  notes of every open booking are currently readable by every authenticated user.
  The `public_bookings` view (or a tightened policy) must land before the pool is
  exposed to real users. Track it as the immediate follow-up to this spike.
- **Distance filtering** will need a real spatial index (GIST on a geography
  column) before the pool scales past a few hundred open bookings; the current
  B-tree on `(lat,lng)` won't serve radius queries.
- **The interest→selection→confirmation→notification chain** is the next sequence
  of plans after this spike + the privacy view; they unlock the actual matching
  loop. Build order: privacy view → interest → selection/confirmation →
  notifications.
- **Reviewer should scrutinize**: that the spike stayed thin (no scope creep into
  matching), and that every booking read either uses a privacy-safe projection or
  carries the documented TODO.
