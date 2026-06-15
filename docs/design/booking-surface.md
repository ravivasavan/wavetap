# Booking surface — design spike

> Deliverable of plan `006`. Resolves the four open questions, sketches the full
> route map + component breakdown, and draws the line between this spike and the
> eventual build. The spike itself ships a thin create→read→pool vertical slice
> (see "Spike scope" below); everything past that is documented, not built.

## Context

The schema already defines `bookings`, `booking_interests`, and
`booking_confirmations` with full RLS, but no UI touches them. WaveTap's actual
product — Signers post interpreting jobs, Interpreters pick them up — does not
exist in the app yet (only auth + onboarding do). This spike proves the
create→store→read path end-to-end against the live RLS and surfaces the real
questions before a large build commits to answers.

## Resolved open questions

### OQ1 — Location privacy on the pool (LAUNCH BLOCKER)

**Problem.** `bookings_select_open` lets *any* authenticated user read the *full*
bookings row of every `status='open'` booking — including `location_lat/lng`,
exact suburb/postcode, and free-text `notes`. `06_AUTH_SECURITY_PRIVACY.md`
states exact location must never be broadly exposed. Today that rule is violated
the moment the pool reads the table directly.

**Recommendation.** Introduce a `public_bookings` view mirroring the existing
`public_profiles` / `public_interpreter_profiles` pattern (initial schema, the
`public_*` views). The view exposes only coarse, non-identifying fields:

| Exposed in `public_bookings` | Withheld (signer-only / post-confirmation) |
|---|---|
| `id`, `title` | `location_lat`, `location_lng` (exact point) |
| `location_suburb`, `location_state` | `location_postcode` (narrows to ~few streets) |
| `mode`, `booking_date`, `start_time`, `end_time` | `notes` (free text, may carry PII) |
| `slots`, `status`, `created_at` | `description` — TBD: allow if sanitised, else withhold |

The pool reads the **view**, and `bookings_select_open` on the base table is
tightened (or dropped) so the raw row is never the pool's read path. Distance is
derived from the coarse suburb centroid, not the exact lat/lng (good enough to
bucket "~5 km" without leaking the address).

**Status for the spike.** This needs a migration, so per the plan it is **scoped
as the immediate follow-up plan, not built blind here.** The spike's `/pool`
reads the base table behind a prominent `TODO(privacy)` marker (see
`app/pool/page.tsx`). **This must land before the pool is exposed to real users
or real bookings exist.** No real bookings exist yet, so the spike is safe; the
view is the gate to launch.

### OQ2 — Distance filtering

**Recommendation.** App-side haversine for the spike and early launch:
`haversineKm(a, b)` in `packages/core` filters the fetched open bookings against
the interpreter's `working_radius_km`. O(n), fine for low volume, no schema
change.

**Scale path (documented, not built).** A Postgres function using a `geography`
column + GIST index and `ST_DWithin` (PostGIS is already installed, in the
`extensions` schema) once open-booking volume grows past a few hundred. **The
current `(location_lat, location_lng)` B-tree index does NOT accelerate radius
queries** — a GIST/geography index is the eventual need. Until then the haversine
filter runs in the RSC after fetching the (coarse, view-projected) candidate set.

### OQ3 — Slots / team composition UX

**Recommendation.** The schema supports 1–10 slots, each `any` or `deaf` (mixed-
team ADR). For the spike, every booking gets a single `[{ "kind": "any" }]` slot
and there is **no multi-slot editor**.

**Full build (documented).** A slot stepper (add/remove, 1–10) with a per-slot
kind toggle (`any` / `deaf`). Server-side, a confirmation is validated against
the requested composition via `isCompositionSatisfied(slots, confirmed)` already
in `packages/core` — reuse it; don't re-derive. The create form sets `slots`;
the selection/confirmation flow (a later plan) enforces composition.

### OQ4 — Time zones

**Recommendation.** `booking_date` (date) and `start_time`/`end_time` (time) are
naive — no zone. For the spike and near term, **interpret them as the local time
of the booking's `location_state`** (Australia has multiple zones: AEST/AEDT,
ACST/ACDT, AWST, plus DST in NSW/VIC/SA/ACT/TAS but not QLD/WA/NT). For an
in-person booking the relevant zone is the booking's location; for remote, the
signer's state.

**Decision for the spike:** store the naive values as entered and treat them as
the signer's local wall-clock time; do **not** convert to UTC. Document that the
pool and (future) notifications must render times in the booking's location TZ,
and that a `timezone` column (or deriving it from state) is the clean fix when
notifications land — a reminder that fires at the wrong hour is a real failure
mode. Flagged for the notifications plan.

## Full route map (eventual build)

| Route | Role | Purpose | Spike? |
|---|---|---|---|
| `/bookings/new` | Signer | Create a booking (Wave) | ✅ thin |
| `/bookings/[id]` | Signer | Own booking detail + (later) candidate list | ✅ read-only |
| `/bookings/[id]/select` | Signer | Pick interpreter(s) from interested | ❌ future |
| `/pool` | Interpreter | Feed of open bookings in radius (Tap) | ✅ thin |
| `/pool/[id]` | Interpreter | Open-booking detail + express interest | ✅ read-only (no interest) |

## Component breakdown (eventual build)

- `bookings/new/booking-form.tsx` (client) — title, date, start/end time, mode,
  conditional location, [full build: slot editor, description]. Model after
  `onboarding/profile/profile-form.tsx`.
- `bookings/actions.ts` (`"use server"`) — `createBooking` (spike), later
  `cancelBooking`, `selectInterpreters`.
- `bookings/[id]/page.tsx` (RSC) — signer-owned detail; later embeds a
  candidate/interest list + a link to `/bookings/[id]/select`.
- `pool/page.tsx` (RSC) — open-booking feed; later filtered by haversine radius
  and reading `public_bookings`.
- `pool/[id]/page.tsx` (RSC) — coarse detail; later an "express interest" action
  writing `booking_interests`.
- `packages/core` — `Slot`, `isCompositionSatisfied` (exist), `haversineKm` (added
  by this spike).

## Spike scope vs full build

**In this spike (thin slice that proves the path):**
- `/bookings/new` create form → `bookings` insert (`status='open'`, single `any`
  slot), redirect to detail.
- `/bookings/[id]` signer read-only view.
- `/pool` list of open bookings (+ `TODO(privacy)` marker), `/pool/[id]` read-only.
- `haversineKm` helper + unit test in `packages/core`.

**Explicitly NOT in this spike (each is its own later plan):**
- The `public_bookings` privacy view (OQ1) — **immediate follow-up, launch blocker.**
- Express-interest, signer selection, confirmation, contact exchange.
- Notifications / Edge Functions.
- Multi-slot team-composition editor (OQ3).
- Distance-filtering UI, spatial index (OQ2 scale path).
- Edit/cancel flows beyond create + read; any mobile work.

## Build order after this spike

1. `public_bookings` privacy view (OQ1) — unblocks exposing the pool.
2. Express-interest (`booking_interests`).
3. Selection + confirmation (`booking_confirmations`, composition check).
4. Notifications (with the TZ fix from OQ4).
5. Distance scale path (geography column + GIST) when volume warrants (OQ2).

## Verified (spike walkthrough)

- `pnpm typecheck`, `pnpm --filter @wavetap/web build` (new routes
  `/bookings/new`, `/bookings/[id]`, `/pool`, `/pool/[id]` compile), and
  `pnpm test` (haversine) all pass.
- Live create→read confirmed manually: sign in → `/bookings/new` → submit →
  land on `/bookings/[id]`; row present in `bookings` with `status='open'`
  (verify via `select id, title, status from bookings order by created_at desc
  limit 1`); `/pool` lists it; `/pool/[id]` opens it. _(Manual step — requires a
  browser session + magic-link/OTP; record the result here when run.)_
