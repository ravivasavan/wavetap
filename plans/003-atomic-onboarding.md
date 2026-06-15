# Plan 003: Make onboarding completion atomic and idempotent

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 10e1b19..HEAD -- apps/web/app/onboarding supabase/migrations`
> If any of these changed since this plan was written, compare "Current state"
> against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (changes the write path that creates every user's profile — the
  most load-bearing mutation in the app)
- **Depends on**: none (independent of 001, but ideally lands after it so the
  profile write path is touched once with both fixes understood)
- **Category**: bug / correctness
- **Planned at**: commit `10e1b19`, 2026-06-12

## Why this matters

`completeOnboarding` does two separate, non-transactional inserts: `profiles`
then (for interpreters) `interpreter_profiles`. If the first succeeds and the
second fails (network blip, transient error), the user has a `profiles` row but
no interpreter row, and the action returns an error. The next retry re-runs the
**`profiles` insert**, which now fails with a duplicate-key/RLS error because the
row already exists — so the user is wedged: half-onboarded, and unable to
complete. The code comment claims the single final write avoids half-rows, but
that guarantee only holds across the *two-table* boundary if both writes are
atomic, which they aren't. There's also a `user.email!` non-null assertion that
turns a missing-email edge case into a cryptic DB error instead of a clean
message. This plan makes completion atomic (both rows commit or neither) and
idempotent (a retry after partial success succeeds instead of dead-ending).

## Current state

- `apps/web/app/onboarding/actions.ts` — the whole action. Key excerpts:
  - Line 26: `if (!user) redirect("/login");` — no email guard after this.
  - Line 52: `email: user.email!,` — non-null assertion.
  - Lines 50-66: `await supabase.from("profiles").insert({...})` then
    `if (profileError) return { error: ... }`.
  - Lines 71-87: separate `await supabase.from("interpreter_profiles").insert({...})`;
    on error returns "profile saved but interpreter details failed" — leaving the
    orphaned/partial state.
  - Line 89: `redirect("/onboarding/done")`.
- `apps/web/app/onboarding/types.ts` — `OnboardingState` type + pure helpers
  (`rolesFromMode`, `activeRoleFromMode`). The action imports these.
- Schema: `profiles` PK is `id uuid` = `auth.users.id`; `interpreter_profiles`
  PK is `id uuid references profiles(id)`. Both have `insert` RLS
  `with check (id = auth.uid())`
  (`supabase/migrations/20260603220659_initial_schema.sql:288, :305`).
- Migrations are applied to the live Sydney project via the Supabase MCP, then
  named to match locally. Naming: `YYYYMMDDHHMMSS_snake_case.sql`.
- **No transaction primitive in supabase-js**: the JS client cannot run a
  multi-statement transaction. The idiomatic Supabase pattern is a Postgres
  function (`SECURITY INVOKER` so RLS still applies) called via `supabase.rpc()`,
  which runs its body in a single implicit transaction.

## Recommended approach (chosen — read before implementing)

Create a `SECURITY INVOKER` Postgres function `complete_onboarding(...)` that does
both inserts in one transaction body, using `ON CONFLICT (id) DO UPDATE` so a
retry is idempotent. `SECURITY INVOKER` means it runs as the calling user, so the
existing own-row RLS `WITH CHECK` policies still enforce `id = auth.uid()` — the
function cannot be abused to write someone else's row. The web action then calls
`supabase.rpc("complete_onboarding", {...})` instead of two `.insert()` calls.

Why this over alternatives:
- *Two inserts + manual rollback in JS*: not atomic — a crash between them still
  orphans a row. Rejected.
- *`upsert` from JS on each table separately*: fixes idempotency but NOT
  atomicity (still two round-trips, either can fail independently). Rejected.
- *Postgres function*: atomic + idempotent + RLS-preserving in one call. Chosen.

## Commands you will need

| Purpose | How | Expected |
|---|---|---|
| Apply migration | Supabase MCP `apply_migration` (name `complete_onboarding_fn`) | success |
| Regenerate types | Supabase MCP `generate_typescript_types` → overwrite `packages/api/src/database.types.ts` | function appears in `Database["public"]["Functions"]` |
| Typecheck | `pnpm typecheck` | exit 0 |
| Test | `pnpm --filter @wavetap/web test` | all pass (after plan 002 lands; else skip) |
| Build | `pnpm --filter @wavetap/web build` | exit 0 |

## Scope

**In scope**:
- `supabase/migrations/<new-timestamp>_complete_onboarding_fn.sql` (create)
- `packages/api/src/database.types.ts` (regenerate — do not hand-edit)
- `apps/web/app/onboarding/actions.ts` (rewrite the body to call the RPC + add the
  email guard)
- `apps/web/app/onboarding/actions.test.ts` (create, if plan 002's Vitest setup
  exists; otherwise note it deferred)
- `plans/README.md` (status update)

**Out of scope**:
- The wizard UI / forms / sessionStorage hook — the client contract
  (`OnboardingState` in, `{error}` | redirect out) is unchanged.
- The column-grant security fix — that's plan 001. If 001 hasn't landed, the
  function's inserts still work (they name only legitimate columns); do not also
  do 001's revoke here.
- Changing validation messages beyond adding the email guard.

## Git workflow

- Branch: `advisor/003-atomic-onboarding`
- Commits: migration + types regen as one; action rewrite + test as another.
  Plain subjects, **no AI-attribution trailers**.
- Do NOT push / open a PR unless instructed.

## Steps

### Step 1: Write the Postgres function migration

Create `supabase/migrations/<new-timestamp>_complete_onboarding_fn.sql`. The
function takes the profile fields + optional interpreter fields, runs both
upserts in its transaction body, and is `SECURITY INVOKER`. Parameter names use
`p_` prefix to avoid colliding with column names.

```sql
-- Atomic, idempotent onboarding commit. Replaces the two separate inserts in
-- completeOnboarding so a partial failure can't orphan a profiles row, and a
-- retry after partial success succeeds (ON CONFLICT DO UPDATE) instead of
-- dead-ending on a duplicate key. SECURITY INVOKER: runs as the caller, so the
-- own-row RLS WITH CHECK policies on both tables still apply.
create or replace function public.complete_onboarding(
  p_email text,
  p_display_name text,
  p_roles text[],
  p_active_role text,
  p_location_suburb text,
  p_location_postcode text,
  p_location_state text,
  p_location_lat numeric,
  p_location_lng numeric,
  p_preferred_contact text,
  p_mobile text,
  p_accepted_terms_at timestamptz,
  p_tos_version text,
  p_is_interpreter boolean,
  p_working_radius_km integer,
  p_availability jsonb,
  p_bio text,
  p_is_deaf_interpreter boolean,
  p_accepts_remote boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (
    id, email, display_name, roles, active_role,
    location_suburb, location_postcode, location_state, location_lat, location_lng,
    preferred_contact, mobile, accepted_terms_at, tos_version
  ) values (
    v_uid, p_email, p_display_name, p_roles, p_active_role,
    p_location_suburb, p_location_postcode, p_location_state, p_location_lat, p_location_lng,
    p_preferred_contact, p_mobile, p_accepted_terms_at, p_tos_version
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    roles = excluded.roles,
    active_role = excluded.active_role,
    location_suburb = excluded.location_suburb,
    location_postcode = excluded.location_postcode,
    location_state = excluded.location_state,
    location_lat = excluded.location_lat,
    location_lng = excluded.location_lng,
    preferred_contact = excluded.preferred_contact,
    mobile = excluded.mobile,
    accepted_terms_at = excluded.accepted_terms_at,
    tos_version = excluded.tos_version;

  if p_is_interpreter then
    insert into public.interpreter_profiles (
      id, working_radius_km, availability_pattern, bio, is_deaf_interpreter, accepts_remote
    ) values (
      v_uid, p_working_radius_km, p_availability, p_bio, p_is_deaf_interpreter, p_accepts_remote
    )
    on conflict (id) do update set
      working_radius_km = excluded.working_radius_km,
      availability_pattern = excluded.availability_pattern,
      bio = excluded.bio,
      is_deaf_interpreter = excluded.is_deaf_interpreter,
      accepts_remote = excluded.accepts_remote;
  end if;
end;
$$;

grant execute on function public.complete_onboarding(
  text, text, text[], text, text, text, text, numeric, numeric, text, text,
  timestamptz, text, boolean, integer, jsonb, text, boolean, boolean
) to authenticated;
```

> Note: the function deliberately does NOT accept `is_admin` or `suspended_at`
> params — it cannot set privilege columns (defense in depth alongside plan 001).
> If plan 001 has tightened column grants, the function still works because
> `SECURITY INVOKER` + the caller's grants apply, and these columns aren't named.

**Verify**: file created; apply via MCP in Step 2.

### Step 2: Apply migration + regenerate types

Apply via Supabase MCP `apply_migration`. Then regenerate the TypeScript types
via MCP `generate_typescript_types` and overwrite
`packages/api/src/database.types.ts`.

**Verify**: `list_migrations` shows the new migration; `grep -n "complete_onboarding"
packages/api/src/database.types.ts` returns a match under `Functions`.

### Step 3: Rewrite the action to call the RPC + add the email guard

In `apps/web/app/onboarding/actions.ts`:
1. After `if (!user) redirect("/login");` add:
   ```ts
   if (!user.email) return { error: "We couldn't read your email. Please sign in again." };
   ```
2. Keep all existing validation (mode, names, location, mobile, terms) unchanged.
3. Keep the `geo = await geocodeAU(...)` call unchanged.
4. Replace the two `.insert()` blocks (lines 50-87) with a single RPC call:
   ```ts
   const { error } = await supabase.rpc("complete_onboarding", {
     p_email: user.email,
     p_display_name: displayName,
     p_roles: roles,
     p_active_role: activeRoleFromMode(state.mode),
     p_location_suburb: state.suburb?.trim() || null,
     p_location_postcode: state.postcode?.trim() || null,
     p_location_state: state.state?.trim() || null,
     p_location_lat: geo?.lat ?? null,
     p_location_lng: geo?.lng ?? null,
     p_preferred_contact: preferredContact,
     p_mobile: state.mobile?.trim() || null,
     p_accepted_terms_at: new Date().toISOString(),
     p_tos_version: TOS_VERSION,
     p_is_interpreter: roles.includes("interpreter"),
     p_working_radius_km: state.workingRadiusKm ?? 30,
     p_availability: state.availability ?? {},
     p_bio: state.bio?.trim() || null,
     p_is_deaf_interpreter: state.isDeafInterpreter ?? false,
     p_accepts_remote: state.acceptsRemote ?? true,
   });
   if (error) {
     console.error("[complete_onboarding]", user.id, error.message);
     return { error: "We couldn't finish setting up your account. Please try again." };
   }
   ```
5. Keep `redirect("/onboarding/done");` at the end.
6. The `email: user.email!` assertion is now gone (replaced by `p_email: user.email`
   after the guard).

**Verify**: `pnpm typecheck` → exit 0 (the regenerated types make the `rpc` call
type-safe — if the param names/types don't match, this fails here). `grep -n
"user.email!" apps/web/app/onboarding/actions.ts` → no matches. `grep -n
"\.insert(" apps/web/app/onboarding/actions.ts` → no matches.

### Step 4: Test (if plan 002's Vitest exists)

If `apps/web/vitest.config.ts` exists, create `apps/web/app/onboarding/actions.test.ts`.
Since the action calls Supabase, test the **pure decision logic** by mocking
`@/lib/supabase/server` and `@/lib/geocode`:
- validation: missing mode / names / location / unaccepted terms each return the
  expected `{error}` and never call `rpc`.
- missing `user.email` returns the email-guard error.
- happy path (interpreter) calls `rpc("complete_onboarding", ...)` with
  `p_is_interpreter: true` and the mapped fields.
- when `rpc` returns an error, the action returns the generic failure message
  (and does not throw).

Mock pattern: `vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))`
returning a stub whose `.auth.getUser()` and `.rpc()` are `vi.fn()`. Note
`redirect()` throws in Next — wrap happy-path assertions accordingly (assert
`rpc` was called rather than asserting the redirect return).

If plan 002 has NOT landed (no vitest config), skip this step and note in your
report that the action test is deferred to when the test harness exists.

**Verify**: `pnpm --filter @wavetap/web test` → all pass.

### Step 5: Manual idempotency confirmation (read-only DB check)

Confirm the function is idempotent without needing a browser. Via Supabase MCP
`execute_sql`, check the function exists and is `SECURITY INVOKER`:
```sql
select proname, prosecdef from pg_proc where proname = 'complete_onboarding';
```
**Expected**: one row, `prosecdef = false` (false = INVOKER, which is what we want).

> A full live idempotency test (call twice, confirm no duplicate-key error)
> requires an authenticated session. Note in your report that a human should run
> one real onboarding, then a forced retry, to confirm end-to-end.

## Test plan

- `apps/web/app/onboarding/actions.test.ts` (above) — validation branches + RPC
  invocation + error handling, all with Supabase mocked. Pattern: standard Vitest
  with `vi.mock`.
- Verification: `pnpm --filter @wavetap/web test` → all pass.
- The atomicity/idempotency guarantee itself is enforced by Postgres (function
  transaction + `ON CONFLICT`), confirmed structurally in Step 5.

## Done criteria

ALL must hold:
- [ ] New migration creating `complete_onboarding` applied (in `list_migrations`).
- [ ] `complete_onboarding` is `SECURITY INVOKER` (Step 5 query: `prosecdef = false`).
- [ ] `packages/api/src/database.types.ts` regenerated; function present under `Functions`.
- [ ] `apps/web/app/onboarding/actions.ts` calls `supabase.rpc("complete_onboarding", ...)` and has no `.insert(` calls and no `user.email!`.
- [ ] Email guard present after the `!user` check.
- [ ] `pnpm typecheck` exits 0; `pnpm --filter @wavetap/web build` exits 0.
- [ ] Action tests pass (or deferral noted if plan 002 not landed).
- [ ] No out-of-scope files modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report (do not improvise) if:
- The regenerated `database.types.ts` doesn't type the `rpc` params as written
  (param name/type mismatch — fix the migration to match, re-apply, regen; if
  still failing, report).
- `supabase.rpc` with `SECURITY INVOKER` returns an RLS/permission error on the
  inserts during testing — means the caller's column grants don't cover a named
  column (interacts with plan 001; report which column).
- The `profiles` or `interpreter_profiles` table shape differs from the "Current
  state" excerpts (schema drifted).
- You find the wizard relies on the two-error-message distinction (separate
  "profile saved but interpreter failed" copy) for a UX branch — it doesn't today,
  but if a form reads that specific string, report before collapsing it.

## Maintenance notes

- **When adding a profile/interpreter column** that onboarding should set: add a
  `p_` param to the function (new migration — functions are `create or replace`,
  so re-apply the whole body), regenerate types, and map it in the action.
- **Reviewer should scrutinize**: that the `ON CONFLICT DO UPDATE` column lists
  match the insert column lists, and that no privilege column leaked into the
  function params.
- **Interpreter "finish later" path**: collapsing the two inserts removes the old
  "profile saved, interpreter details failed" partial state. That copy and any
  future "complete your interpreter profile later" flow should now assume the
  interpreter row exists whenever the profile does (for interpreter-mode users).
