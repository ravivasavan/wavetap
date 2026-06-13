# WaveTap web app — agent guide

The WaveTap web app: **Next 15 App Router + React 19 + Tailwind v4 + HeroUI v3
(`@heroui-pro/react`)**, with a **Supabase** backend accessed via `@supabase/ssr`.
It lives in a **pnpm + Turborepo** monorepo (`apps/web`, `apps/mobile`,
`packages/{api,core,tokens,config}`). This file is the source of truth for how to
build, test, and extend the web app — prefer it over re-deriving conventions from
the `01`–`11` spec docs.

## Commands

Run from the repo root unless noted.

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm web` (→ `next dev --turbopack`) |
| Typecheck (all packages) | `pnpm typecheck` |
| Build web | `pnpm --filter @wavetap/web build` |
| Test | `pnpm test` (or `pnpm --filter @wavetap/web test`) |
| Lint | `pnpm lint` |
| Format | `pnpm format` (write) / `pnpm --filter @wavetap/web format:check` |

**Pre-push gate:** `pnpm typecheck && pnpm lint && pnpm test`. CI
(`.github/workflows/ci.yml`) runs that plus the web build on every PR and push to
`main`. Dev uses Turbopack on purpose — webpack dev empties the Tailwind v4 CSS
bundle on HMR (pages render unstyled); see the vault lesson on this.

## Layout

- `app/` — routes:
  - `/` landing (holding page), `/login` (email entry), `/login/check` (OTP),
    `/auth/confirm` (magic-link route handler), `/home`.
  - `app/onboarding/*` — the wizard (see below).
- `lib/supabase/` — four clients, do not mix them up:
  - `client.ts` — **browser** client (client components).
  - `server.ts` — **RSC / server actions** client (cookie-bound session).
  - `middleware.ts` — session refresh + route gating (`updateSession`).
  - `admin.ts` — **service-role** client, **SERVER-ONLY** (ban check, privileged
    writes). Never import from a client component.
- `lib/auth/profile.ts` — `requireUser` / profile-existence helpers used to gate
  `/home` vs `/onboarding`.
- `lib/geocode.ts` — best-effort Nominatim (OpenStreetMap) geocoding; returns
  `null` on any failure so it never blocks signup. SERVER-ONLY.
- `middleware.ts` — wires `updateSession` for all non-static routes.

## Auth model

Passwordless. Two co-equal paths:

- **Magic link** → `/auth/confirm` route handler verifies `token_hash`.
- **6-digit OTP** → `/login/check` (HeroUI InputOTP).

`verifyOtp` uses `type: "email"` — **not** PKCE. The middleware (`updateSession`)
refreshes the session cookie on every request and redirects unauthenticated users
to `/login`. **Public routes** (no session needed): `/`, anything under `/login`,
anything under `/auth`. Everything else requires auth.

## Onboarding

A multi-step wizard under `app/onboarding/`:
`welcome → start → profile → (interpreter, if applicable) → notifications → terms
→ done`. Wizard state lives in **sessionStorage** (`use-onboarding.ts`), and the
whole thing is committed by **one** server action, `completeOnboarding`
(`app/onboarding/actions.ts`), which inserts `profiles` (and
`interpreter_profiles` for interpreters) under the user's own RLS session. There's
no valid half-row (NOT NULL / CHECK constraints), so it's a single final write.

Roles: `signer` / `interpreter` / `both`. Dual-role users default `active_role`
to `signer`. Pure role/availability helpers live in `app/onboarding/types.ts`
(unit-tested in `types.test.ts`).

## Supabase / migrations

- Migrations: `supabase/migrations/`, named `YYYYMMDDHHMMSS_snake_case.sql`.
- Apply to the **live Sydney project via the Supabase MCP** (`apply_migration`),
  then name the local file to match the applied version. **Never edit an applied
  migration — always add a new one.**
- RLS is on for every table. `profiles` / `interpreter_profiles` are
  **own-row-only**; the booking pool reads others through the
  `public_profiles` / `public_interpreter_profiles` views (safe columns only).
- **Privilege columns are server-role-only**: `profiles.is_admin` and
  `profiles.suspended_at` have no INSERT/UPDATE grant for `authenticated` (see
  the `restrict_profiles_sensitive_columns` migration). Admin mutations to them
  must go through the service-role client.
- Regenerate types with the MCP `generate_typescript_types` →
  `packages/api/src/database.types.ts` (re-exported as `Database` from
  `@wavetap/api`).

## Design tokens

DTCG source in `design-tokens/*.json` → `packages/tokens/build.mjs` →
`theme.css` + `tokens.gen.ts`. Use the token CSS vars / semantic classes
(`text-foreground`, `text-muted`, `bg-accent`, …) — **never literal hex** in
components. The web app imports `@wavetap/tokens/theme.css` after the HeroUI
layers; Inter is self-hosted via `next/font`.

## HeroUI v3 conventions

- **No Provider needed** — components work directly.
- **Compound components**: `Sheet.Trigger`, `Sheet.Content`, etc.
- Use **`onPress`, not `onClick`**, on interactive elements.
- Requires **Tailwind v4** (not v3).

## Conventions

- Imports use the `@/` alias (configured in `tsconfig`).
- Server actions live in `app/*/actions.ts` with `"use server"` at the top.
- Action error returns are `{ error: string }`-shaped; success redirects or
  returns `void`.
