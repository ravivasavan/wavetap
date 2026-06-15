# Plan 002: Establish a verification baseline (CLAUDE.md, ESLint, CI, smoke tests)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 10e1b19..HEAD -- apps/web package.json turbo.json`
> If any of these changed since this plan was written, compare "Current state"
> against the live files before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (additive tooling; no production code logic changes)
- **Depends on**: none (but every other plan benefits from landing this first)
- **Category**: tests / dx
- **Planned at**: commit `10e1b19`, 2026-06-12

## Why this matters

This repo has **zero tests, no CI, no working linter, and no `CLAUDE.md` for the
web app** — yet it's built almost entirely by AI agents and deployed to
production on Vercel. Today the only safety net is "the author remembers to run
`pnpm typecheck` and `pnpm build` locally." A bad migration, a botched RLS
change, or a broken redirect ships silently. The single highest-leverage
non-security investment is a verification baseline: a one-command way to know the
code works, enforced in CI, plus a `CLAUDE.md` so future agents stop re-deriving
the build/test/migration conventions from eleven scattered spec docs. This plan
is a prerequisite that makes every later change (booking surface, auth hardening)
safe to execute and review.

## Current state

- `package.json` (root) scripts: `dev`, `build`, `lint` (→ `turbo run lint`),
  `typecheck`, `web`, `mobile`. **No `test`, no `format` script.**
- `apps/web/package.json:9` — `"lint": "next lint"`. **There is no ESLint config
  file anywhere** (`ls apps/web/.eslintrc* apps/web/eslint.config.*` → no
  matches), so `next lint` either prompts to set one up or no-ops. `turbo.json`
  has an empty `"lint": {}` task.
- No `.github/` directory → no CI. Vercel builds `apps/web` on push but never
  typechecks `apps/mobile` or `packages/*`, and never runs lint or tests.
- `packages/config/prettier.config.mjs` exists but **no app references it** and
  there's no `.prettierrc` or format script wiring it up.
- No `*.test.*` / `*.spec.*` files exist in the entire repo.
- `apps/mobile/` has a stub `CLAUDE.md`; `apps/web/` has none. Build/test/
  migration conventions live across root docs `01`–`11` and the vault.
- Pure logic worth unit-testing already exists and is React-free:
  - `apps/web/app/onboarding/types.ts` — `rolesFromMode`, `activeRoleFromMode`,
    `isInterpreter`, `emptyAvailability`, `isLiveInterpreter` (all pure).
  - `apps/web/lib/geocode.ts` — `geocodeAU` (fetch-based; mock `fetch`).
- Package manager: `pnpm@11.1.3`, Node `>=22`. Turborepo `^2.3.3`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck all | `pnpm typecheck` | exit 0 |
| Build web | `pnpm --filter @wavetap/web build` | exit 0 |
| Run tests (after this plan) | `pnpm test` | all pass |
| Lint (after this plan) | `pnpm lint` | exit 0 (reports real issues) |

## Suggested executor toolkit

- Vitest is the right test runner for a Next 15 / React 19 / pnpm-workspace repo
  (fast, ESM-native, Vite-powered). Do **not** introduce Jest.
- For ESLint, use **flat config** (`eslint.config.mjs`) — Next 15 + ESLint 9
  default. `next lint` is deprecated in favor of the ESLint CLI in Next 15; this
  plan migrates to it.

## Scope

**In scope** (create unless noted):
- `apps/web/CLAUDE.md`
- `apps/web/eslint.config.mjs`
- `apps/web/vitest.config.ts`
- `apps/web/app/onboarding/types.test.ts`
- `apps/web/lib/geocode.test.ts`
- `apps/web/package.json` (add `test`, `format` scripts; change `lint`)
- `package.json` (root — add `test`, `format` passthrough scripts)
- `turbo.json` (add `test` task)
- `.github/workflows/ci.yml`
- `.prettierignore` (root)
- `plans/README.md` (status update)

**Out of scope** (do NOT touch):
- Any production code under `apps/web/app/**` or `apps/web/lib/**` except adding
  the two `*.test.ts` files. This plan adds verification, it does not change
  behavior. If a test reveals a bug, **report it** — do not fix it here (the bugs
  are covered by plans 003/004).
- `apps/mobile/**` — mobile test/lint setup is a separate effort; CI will
  typecheck it but this plan doesn't add mobile tests.
- Reformatting the existing codebase with Prettier (would create a huge
  noise diff). Add the tooling; do a formatting sweep in a separate commit later.

## Git workflow

- Branch: `advisor/002-verification-baseline`
- Commit per logical unit (CLAUDE.md / eslint / vitest+tests / CI). Plain
  imperative subjects, **no AI-attribution trailers** (repo CLAUDE.md forbids
  `Co-Authored-By` and "Generated with" lines).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Write `apps/web/CLAUDE.md`

Create a concise (~120-line) guide. It must contain, in this order:

1. **One-paragraph what-this-is**: WaveTap web app — Next 15 App Router + React 19
   + Tailwind v4 + HeroUI v3 (`@heroui-pro/react`), Supabase backend
   (`@supabase/ssr`), pnpm+Turborepo monorepo.
2. **Commands** (from the table above): install, dev (`pnpm web`), typecheck,
   build, test, lint, format. Note `pnpm typecheck && pnpm lint && pnpm test`
   is the pre-push gate.
3. **Layout**: `app/` routes (auth, login, login/check, onboarding/*, home,
   landing); `lib/supabase/{client,server,middleware,admin}.ts` (client = browser,
   server = RSC/actions, middleware = session refresh, admin = service-role
   SERVER-ONLY); `lib/auth/profile.ts` (requireUser / userHasProfile);
   `lib/geocode.ts` (best-effort Nominatim).
4. **Auth model**: passwordless — magic link (`/auth/confirm` route) + co-equal
   6-digit OTP (`/login/check`). `verifyOtp` uses `type: "email"` (not PKCE).
   Middleware gates all non-public routes; public = `/`, `/login*`, `/auth*`.
5. **Onboarding**: 7-step wizard under `app/onboarding/`, state in sessionStorage
   (`use-onboarding.ts`), committed once by `completeOnboarding` server action.
   Roles: `signer` / `interpreter` / `both`.
6. **Supabase / migrations**: schema in `supabase/migrations/` named
   `YYYYMMDDHHMMSS_snake_case.sql`. Applied to the live Sydney project **via the
   Supabase MCP** (`apply_migration`), then the local file is named to match.
   RLS on every table; `profiles`/`interpreter_profiles` are own-row-only; pool
   reads others via `public_profiles`/`public_interpreter_profiles` views. **Never
   edit an applied migration — add a new one.** Privilege columns (`is_admin`,
   `suspended_at`) are server-role-only (see migration history). Regenerate types
   with the MCP `generate_typescript_types` → `packages/api/src/database.types.ts`.
7. **Design tokens**: DTCG source in `design-tokens/*.json` → `packages/tokens/build.mjs`
   → `theme.css` / `tokens.gen.ts`. Use token CSS vars / semantic classes
   (`text-foreground`, `text-muted`), **not literal hex**.
8. **HeroUI v3 conventions**: no Provider needed; compound components
   (`Sheet.Trigger`); use **`onPress` not `onClick`**; requires Tailwind v4.
9. **Conventions**: imports use `@/` alias; server actions in `app/*/actions.ts`
   with `"use server"`; error returns are `{ error: string }` shaped.

**Verify**: `test -f apps/web/CLAUDE.md && wc -l apps/web/CLAUDE.md` → file exists,
non-trivial line count.

### Step 2: ESLint flat config + script

Create `apps/web/eslint.config.mjs` using Next's flat-config compat. Minimal,
non-pedantic config (this repo values signal over noise):

```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
```

Add the dev deps to `apps/web/package.json`: `eslint@^9`, `eslint-config-next`
(match the Next version — `^15`), `@eslint/eslintrc@^3`. Change the lint script:

```json
"lint": "eslint .",
```

**Verify**: `pnpm install` → exit 0; `pnpm --filter @wavetap/web lint` → runs and
reports (exit 0 if clean, or a list of real findings). If it reports findings,
record them in your final report — **do not auto-fix code** beyond
trivial lint (unused imports are fine to remove; logic changes are out of scope).

### Step 3: Vitest + the two unit test files

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: { alias: { "@": import.meta.dirname } },
});
```

Add dev deps to `apps/web/package.json`: `vitest@^3`. Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Create `apps/web/app/onboarding/types.test.ts` covering the pure helpers in
`apps/web/app/onboarding/types.ts`:
- `rolesFromMode("both")` → `["signer","interpreter"]`; `"signer"` → `["signer"]`.
- `activeRoleFromMode("both")` → `"signer"`; `"interpreter"` → `"interpreter"`.
- `isInterpreter` for each mode.
- `emptyAvailability()` returns all 7 weekdays with `{available:false,period:null}`.
- `isLiveInterpreter`: false with no area, false with area but no availability,
  true with both (build the availability via `emptyAvailability()` then flip one
  day's `available`).

Create `apps/web/lib/geocode.test.ts` covering `geocodeAU`:
- returns `null` when both suburb and postcode are empty (no fetch made).
- returns `{lat,lng}` on a mocked `fetch` resolving `[{lat:"-33.8",lon:"151.2"}]`
  (stub `globalThis.fetch` with `vi.fn`).
- returns `null` when fetch rejects / times out.
- returns `null` when the response array is empty.

**Verify**: `pnpm --filter @wavetap/web test` → all tests pass (≥ ~10 cases).

### Step 4: Root passthrough + turbo task

In root `package.json` add:
```json
"test": "turbo run test",
"format": "turbo run format"
```
In `turbo.json` add a `test` task:
```json
"test": { "dependsOn": ["^build"] }
```
Create root `.prettierignore`:
```
node_modules
.next
.expo
dist
.turbo
**/database.types.ts
**/tokens.gen.ts
pnpm-lock.yaml
```

**Verify**: `pnpm test` from repo root → runs the web tests, all pass.

### Step 5: GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.1.3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm --filter @wavetap/web build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key
          SUPABASE_SERVICE_ROLE_KEY: ci-placeholder-service-key
          NEXT_PUBLIC_APP_URL: https://wavetap.app
          HEROUI_AUTH_TOKEN: ${{ secrets.HEROUI_AUTH_TOKEN }}
```

> The build step needs the HeroUI Pro token to fetch `@heroui-pro/react` (the
> repo already sets `HEROUI_AUTH_TOKEN` on Vercel). The Supabase env values are
> harmless placeholders — the web build does not contact Supabase at build time,
> it only needs the vars to be present. If `pnpm install` fails in CI because a
> build script is unapproved (this repo previously hit this with
> `@zowe/secrets-for-zowe-sdk`), check `pnpm-workspace.yaml` for the existing
> `allowedBuilds`/`onlyBuiltDependencies` handling and mirror it — do not
> disable frozen-lockfile.

**Verify**: YAML is valid (`cat .github/workflows/ci.yml`); locally run the same
sequence the job runs: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @wavetap/web build`
→ all exit 0. (You cannot run the GH Action itself locally; the local sequence is
the proxy.)

## Test plan

The new tests ARE the deliverable for this plan:
- `apps/web/app/onboarding/types.test.ts` — pure helper coverage (above).
- `apps/web/lib/geocode.test.ts` — geocode success/failure/empty/timeout (above).
- Structural pattern: standard Vitest `describe`/`it`/`expect`; mock `fetch` with
  `vi.fn()` and restore in `afterEach`.
- Verification: `pnpm test` → all pass.

These are intentionally a *starter* suite (pure logic + one fetch-mock module),
not full coverage. E2E (Playwright login→onboarding) is explicitly deferred — see
Maintenance notes — because it needs a live Supabase test project and real
magic-link/OTP, which is a larger setup than this baseline.

## Done criteria

ALL must hold:

- [ ] `apps/web/CLAUDE.md` exists and covers commands, layout, auth, onboarding, migrations, tokens, HeroUI conventions.
- [ ] `pnpm lint` exits 0 (or reports only findings you've documented in the report, with no logic edits made).
- [ ] `pnpm test` runs ≥10 passing cases across the two test files.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm --filter @wavetap/web build` exits 0.
- [ ] `.github/workflows/ci.yml` exists and the local equivalent sequence passes.
- [ ] No production code under `app/**`/`lib/**` changed except the two added test files (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report (do not improvise) if:
- `next/core-web-vitals` flat-config extends fail to resolve (Next version may
  need a different eslint-config-next major — report the version mismatch).
- `pnpm install` after adding deps changes the lockfile in a way that breaks an
  existing app build (report the conflict).
- Lint surfaces > ~20 findings (means the config is too strict for this repo's
  current state — report and propose narrowing rather than fixing 20 things).
- Any added test reveals a real production bug (e.g. `geocodeAU` doesn't behave
  as the test asserts) — report it as a finding; do not change `lib/geocode.ts`.

## Maintenance notes

- **Deferred E2E**: a Playwright smoke (`/login` → OTP → `/onboarding` → `/home`)
  needs a dedicated Supabase test project + a way to read the OTP (admin
  `generateLink` or a mailbox). Worth doing once the booking surface lands so the
  critical path is regression-protected. Track separately.
- **Mobile**: CI typechecks `apps/mobile` via `pnpm typecheck` but has no mobile
  tests/lint. Add when mobile gets real (non-template) code.
- **Reviewer should scrutinize**: that no production logic changed (this is a
  tooling-only plan), and that CI actually gates `main` (branch protection is a
  GitHub setting, not in this repo — note it for the maintainer to enable).
- **Formatting sweep deferred**: running `pnpm format` across the repo will
  produce a large diff; do it as its own commit so it doesn't bury logic changes.
