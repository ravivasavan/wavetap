# Plan 001: Close the `profiles` privilege-escalation hole (self-grant admin / un-suspend)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 10e1b19..HEAD -- supabase/migrations`
> If any migration file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (RLS/grant change on the live Sydney project; must not lock the app's own legitimate inserts/updates out)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `10e1b19`, 2026-06-12

## Why this matters

Any authenticated user can make themselves a site admin, or un-suspend their own
banned account, with a single direct REST call to Supabase — the app UI is not
involved and cannot prevent it. The `profiles` table grants `INSERT, UPDATE` to
the `authenticated` role at the table level (every column), and the RLS policies
only check `id = auth.uid()` (row ownership) — they do **not** restrict *which
columns* a user may set. So a user can `PATCH /rest/v1/profiles?id=eq.<their-id>`
with `{"is_admin": true}` using the public anon key plus their own session JWT,
and RLS happily allows it because they own the row. `is_admin` then unlocks every
admin RLS policy (`profiles_select_admin`, `bookings_update_admin`,
`banned_emails_all_admin`, the admin audit log, etc.). The same hole lets a
suspended user clear their own `suspended_at`. This is the single highest-severity
issue in the codebase and must be closed before the booking surfaces (which add
real data to protect) or the admin panel ship.

## Current state

- `supabase/migrations/20260603220659_initial_schema.sql:38-60` — `profiles`
  table. Sensitive columns a user must NOT be able to set on themselves:
  ```sql
  is_admin boolean not null default false,   -- line 53
  ```
  Plus `suspended_at timestamptz` added later in
  `supabase/migrations/20260604062623_harden_postgis_and_add_suspension.sql:15`.
- `supabase/migrations/20260603220659_initial_schema.sql:287-295` — the RLS
  policies. Note `with check (id = (select auth.uid()))` — ownership only, no
  column restriction:
  ```sql
  create policy profiles_insert_own on public.profiles
    for insert to authenticated with check (id = (select auth.uid()));
  create policy profiles_update_own on public.profiles
    for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
  create policy profiles_update_admin on public.profiles
    for update to authenticated using (public.is_admin()) with check (public.is_admin());
  ```
- `supabase/migrations/20260603220659_initial_schema.sql:437` — the over-broad
  grant (all columns):
  ```sql
  grant select, insert, update on public.profiles to authenticated;
  ```
- `apps/web/app/onboarding/actions.ts:50-66` — the **only** legitimate insert.
  It sets `id, email, display_name, roles, active_role, location_*,
  preferred_contact, mobile, accepted_terms_at, tos_version`. It does **not**
  set `is_admin`, `suspended_at`, `notification_*`, `avatar_url`, `sign_languages`
  — those rely on column defaults. This is the column set your grant must keep
  allowing.
- There is currently **no profile-update code path in the app at all** (no
  `/profile` edit route exists yet), so tightening UPDATE column privileges
  cannot break existing app behavior — only future edit screens, which will be
  built against whatever grant this plan establishes.

### Why a column-level GRANT is the right mechanism

Postgres column-level privileges are enforced *underneath* RLS and the Data API:
revoking `UPDATE(is_admin)` from `authenticated` makes the column unwritable by
that role regardless of which row or policy is in play, while leaving the rest of
the row writable. RLS `WITH CHECK` cannot easily express "this column's value did
not change" without a trigger, so column grants are the simpler, standard fix.
`service_role` keeps `GRANT ALL` (line 452) so server-side admin code is
unaffected.

## Commands you will need

This plan changes the **database**, not app code. Apply via the Supabase MCP
(the project is already linked — see `.mcp.json`), then mirror the SQL into a
committed migration file so the schema stays reproducible.

| Purpose | How | Expected on success |
|---|---|---|
| Apply migration to live DB | Supabase MCP `apply_migration` with name `restrict_profiles_sensitive_columns` | returns success, no error |
| Verify grants | Supabase MCP `execute_sql` with the query in Step 3 | `is_admin`/`suspended_at` NOT in authenticated's updatable columns |
| Regenerate types (optional, no shape change here) | Supabase MCP `generate_typescript_types` | types match `packages/api/src/database.types.ts` |
| Typecheck | `pnpm typecheck` | exit 0 |
| Build | `pnpm --filter @wavetap/web build` | exit 0, 6+ routes compiled |

Migration file naming convention (match existing): `YYYYMMDDHHMMSS_snake_case.sql`
in `supabase/migrations/`. Existing examples: `20260604062759_revoke_is_admin_from_anon.sql`.
Use a timestamp later than `20260604114331`.

## Scope

**In scope** (the only files you should create/modify):
- `supabase/migrations/<new-timestamp>_restrict_profiles_sensitive_columns.sql` (create)
- `plans/README.md` (status update only)

**Out of scope** (do NOT touch):
- `apps/web/app/onboarding/actions.ts` — the insert is already safe (doesn't set
  sensitive columns); no change needed. Do not "defensively" edit it.
- Any other migration file — never edit an already-applied migration; only add a
  new one.
- The `interpreter_profiles`, `bookings`, etc. grants — out of scope for this
  plan (their grants don't expose a privilege column; revisit separately if an
  audit flags one).

## Git workflow

- Branch: `advisor/001-profiles-priv-esc`
- One commit. Message style matches `git log` (plain imperative subject, no
  AI-attribution trailer — this repo's CLAUDE.md forbids `Co-Authored-By`/
  "Generated with" lines; do not add them).
  Example subject: `Security: revoke authenticated write on profiles privilege columns`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the migration

Create `supabase/migrations/<new-timestamp>_restrict_profiles_sensitive_columns.sql`
with this content. The approach: revoke the blanket column privileges, then
re-grant `INSERT`/`UPDATE` only on the columns a normal user legitimately sets.
`SELECT` stays on the whole row (own-row RLS already limits which rows).

```sql
-- Phase 02 security fix: the table-level INSERT/UPDATE grant on profiles let any
-- authenticated user set is_admin or clear suspended_at on their own row (RLS
-- only checks row ownership, not which columns change). Replace the blanket
-- grant with column-scoped privileges so privilege columns are server-only.

-- Drop the over-broad column privileges for the authenticated role.
revoke insert, update on public.profiles from authenticated;

-- Re-grant INSERT only on the columns onboarding legitimately writes
-- (apps/web/app/onboarding/actions.ts). id is the row key; the rest are user data.
-- Columns deliberately EXCLUDED: is_admin, suspended_at (privilege/state — server only).
grant insert (
  id, email, display_name, roles, active_role,
  location_suburb, location_postcode, location_state, location_lat, location_lng,
  sign_languages, preferred_contact, mobile, avatar_url,
  notification_email, notification_push, notification_sms,
  accepted_terms_at, tos_version
) on public.profiles to authenticated;

-- Re-grant UPDATE only on columns a user may edit later from a profile screen.
-- Same exclusions; email is excluded too (identity is owned by auth.users, not
-- user-editable here).
grant update (
  display_name, roles, active_role,
  location_suburb, location_postcode, location_state, location_lat, location_lng,
  sign_languages, preferred_contact, mobile, avatar_url,
  notification_email, notification_push, notification_sms
) on public.profiles to authenticated;

-- SELECT on the full row is unchanged (own-row RLS governs visibility).
-- service_role retains GRANT ALL from the initial schema (server-side admin paths).
```

**Important**: the column list in the `INSERT` grant must be a **superset** of every
column the onboarding insert names, or onboarding will start failing with a
permission error. Cross-check against `apps/web/app/onboarding/actions.ts:50-66`
before applying. The list above already includes all of them.

**Verify**: file exists, SQL parses (no syntax check tool locally; the apply step
in Step 2 is the real gate).

### Step 2: Apply to the live database

Apply the migration using the Supabase MCP `apply_migration` tool (name:
`restrict_profiles_sensitive_columns`, query: the SQL from Step 1). This is the
project's established workflow (migrations are applied via MCP, then the local
file is named to match — see the existing migration timestamps).

**Verify**: the tool returns success. Then list migrations (MCP `list_migrations`)
and confirm the new migration name appears.

### Step 3: Prove the hole is closed

Run this read-only query via Supabase MCP `execute_sql` to confirm `authenticated`
can no longer write the privilege columns:

```sql
select column_name, privilege_type
from information_schema.column_privileges
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('is_admin', 'suspended_at')
order by column_name, privilege_type;
```

**Expected**: **zero rows** for `INSERT`/`UPDATE` on `is_admin` and
`suspended_at`. (A `SELECT` row may appear — that's fine and intended.)

Then confirm a legitimate column is still writable:

```sql
select privilege_type from information_schema.column_privileges
where grantee = 'authenticated' and table_schema = 'public'
  and table_name = 'profiles' and column_name = 'display_name';
```

**Expected**: rows including `INSERT` and `UPDATE`.

### Step 4: Confirm onboarding still works end-to-end

The riskiest regression is breaking the legitimate onboarding insert. Verify the
build compiles and the insert column set is covered:

**Verify**:
- `pnpm typecheck` → exit 0
- `pnpm --filter @wavetap/web build` → exit 0
- Manual cross-check (already done in Step 1, re-confirm): every column in
  `apps/web/app/onboarding/actions.ts:50-66` appears in the `grant insert (...)`
  list. If any is missing → STOP (the next real onboarding would fail with
  `permission denied for column ...`).

> Note for the executor: a full live onboarding click-through requires a browser
> session and a real magic-link/OTP, which a headless run can't do. The column
> cross-check + successful build is the gate here; flag in your report that a
> human should do one real onboarding run post-merge to be certain.

## Test plan

There is no test suite in this repo yet (see plan 002 if it exists). Verification
for this plan is the SQL privilege check in Step 3 plus the build in Step 4 — no
new automated test is required. If plan 002 (test baseline) has already landed and
an RLS/integration test harness exists, add a test that asserts a non-admin
authenticated client receives a permission error when attempting to set
`is_admin = true` on its own profile row; otherwise defer that to plan 002's scope
and note it.

## Done criteria

ALL must hold:

- [ ] New migration file exists in `supabase/migrations/` with a timestamp later than `20260604114331` and the content from Step 1.
- [ ] Migration applied to the live project (appears in `list_migrations`).
- [ ] Step 3 query returns **zero** INSERT/UPDATE rows for `is_admin` and `suspended_at` on `authenticated`.
- [ ] Step 3 second query confirms `display_name` still has INSERT + UPDATE for `authenticated`.
- [ ] Every column in `apps/web/app/onboarding/actions.ts:50-66`'s insert is present in the `grant insert (...)` column list.
- [ ] `pnpm typecheck` exits 0 and `pnpm --filter @wavetap/web build` exits 0.
- [ ] No files outside the in-scope list modified (`git status`).
- [ ] `plans/README.md` status row updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- The `profiles` table or its grants in the migrations don't match the "Current
  state" excerpts (schema drifted — a newer migration may already have changed
  the grant).
- Applying the migration errors (e.g. a column in the grant list doesn't exist —
  means the table schema differs from the excerpt).
- After applying, the Step 3 query still shows INSERT/UPDATE on `is_admin` (the
  revoke didn't take — possibly a second grant elsewhere re-adds it; find and
  report it, don't pile on more revokes blindly).
- The onboarding insert references a column NOT in your grant list (would break
  signups — widen the list to include it and note it, or stop if unsure).

## Maintenance notes

- **When a `/profile` edit screen is built**: it can only write the columns in the
  `grant update (...)` list. If a new user-editable column is added to `profiles`,
  add it to that grant in a new migration — otherwise edits to it silently fail
  with a permission error.
- **When the admin panel is built**: admin mutations to `is_admin`/`suspended_at`
  must go through `service_role` (server-side, e.g. a server action using
  `lib/supabase/admin.ts`), never the user's `authenticated` client — that's now
  enforced at the DB layer, which is the point.
- **Reviewer should scrutinize**: that the INSERT grant column list is a complete
  superset of the onboarding insert, and that `is_admin`/`suspended_at` are absent
  from both INSERT and UPDATE grants.
- **Related hardening deferred**: enforcing `suspended_at` at login (a suspended
  user can still sign in today — separate finding/plan). Closing the write hole
  here is the prerequisite; the read/enforce side is independent.
