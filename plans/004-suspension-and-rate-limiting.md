# Plan 004: Enforce suspension and add OTP/login rate limiting at the auth boundary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 10e1b19..HEAD -- apps/web/app/login apps/web/lib supabase/migrations`
> If any changed since this plan was written, compare "Current state" against the
> live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches the login path every user hits; a bug here can lock
  legitimate users out)
- **Depends on**: 001 (a user can clear their own `suspended_at` until 001 lands,
  which makes enforcement pointless)
- **Category**: security
- **Planned at**: commit `10e1b19`, 2026-06-12

## Why this matters

Two gaps at the auth boundary:

1. **Suspension is defined but never enforced.** The `profiles.suspended_at`
   column exists (added to back the admin "suspend account" flow), but a grep of
   `apps/web` shows **zero reads** of it. An admin can suspend a user and that
   user keeps full access — sign-in works, the session refreshes, every authed
   route loads. The control is decorative.

2. **No application-layer rate limiting on the OTP endpoints.** `sendOtp`,
   `resendOtp`, and `verifyCode` call Supabase Auth directly. Supabase has some
   built-in limits, but the app adds none of its own — nothing throttles repeated
   `verifyCode` attempts against a known email, so the 6-digit code is more
   brute-forceable than it should be, and `sendOtp`/`resendOtp` can be used to
   spray sign-in emails.

This plan enforces suspension at the gate (login + middleware) and adds a simple,
durable rate limit on the OTP actions.

## Current state

- `supabase/migrations/20260604062623_harden_postgis_and_add_suspension.sql:15` —
  `alter table public.profiles add column suspended_at timestamptz;` (null = active).
- `apps/web/lib/auth/profile.ts` — `requireUser()` (returns user or redirects to
  `/login`) and `userHasProfile(userId)` (own-row `profiles` select). **No
  suspension check.**
- `apps/web/lib/supabase/middleware.ts:20-53` — `updateSession`: refreshes the
  session, redirects unauthenticated users away from non-public routes. `isPublic`
  = `/`, `/login*`, `/auth*`. **No suspension check.**
- `apps/web/app/login/actions.ts` — `sendOtp`: lowercases email, checks
  `banned_emails` via the service-role admin client (`createAdminClient`), then
  `signInWithOtp`. The banned-email gate is the existing precedent for a
  server-side pre-auth check. **No rate limiting.**
- `apps/web/app/login/check/actions.ts` — `verifyCode(email, token)` →
  `verifyOtp`; `resendOtp(email)` → `signInWithOtp`. **No rate limiting.**
- `apps/web/lib/supabase/admin.ts` — `createAdminClient()` service-role client,
  SERVER-ONLY, bypasses RLS. This is what suspension/ban checks use pre-auth.
- No Redis/KV is provisioned. The deployment is Vercel + Supabase.

## Approach decisions (read before implementing)

**Suspension enforcement** — check `suspended_at` in two places:
- *Login* (`verifyCode` success and the `/auth/confirm` route): after the session
  is established, look up `suspended_at`; if set, sign the user out and return a
  friendly "account suspended" message. This blocks the entry point.
- *Middleware*: also check on protected requests so an already-signed-in user who
  gets suspended is ejected on their next navigation, not just at next login.
  Keep it cheap — only when a session exists and the route isn't public.

  To avoid an extra DB round-trip on *every* request, this plan adds the check in
  `updateSession` guarded by "user exists AND route is protected." That's the same
  request set that already does `getUser()`. One indexed PK lookup on `profiles`
  is acceptable; if profiling later shows cost, cache it in a short-lived cookie
  (deferred — see Maintenance notes).

**Rate limiting** — use Supabase itself as the store (no new infra). Create a
`auth_rate_limits` table written via the service-role admin client, keyed by
`(scope, key)` with a counter + window. This is a pragmatic fixed-window limiter,
sufficient for abuse mitigation at current scale. Do NOT pull in Upstash/Redis
for this — it's a new vendor for a problem the existing DB handles.

> If the maintainer prefers, Supabase's built-in auth rate limits can be tuned in
> the dashboard instead of an app-layer limiter. This plan implements the
> app-layer limiter because it's enforceable from code and testable; note the
> dashboard option in your report so the maintainer can choose.

## Commands you will need

| Purpose | How | Expected |
|---|---|---|
| Apply migration | Supabase MCP `apply_migration` | success |
| Regenerate types | Supabase MCP `generate_typescript_types` → `packages/api/src/database.types.ts` | new table present |
| Typecheck | `pnpm typecheck` | exit 0 |
| Test | `pnpm --filter @wavetap/web test` | pass (if plan 002 landed) |
| Build | `pnpm --filter @wavetap/web build` | exit 0 |

## Scope

**In scope**:
- `supabase/migrations/<ts>_auth_rate_limits.sql` (create — the rate-limit table,
  RLS-locked to service_role only)
- `packages/api/src/database.types.ts` (regenerate)
- `apps/web/lib/auth/suspension.ts` (create — `isSuspended(userId)` helper using
  the admin client)
- `apps/web/lib/auth/rate-limit.ts` (create — `checkRateLimit(scope, key, max, windowSec)`)
- `apps/web/lib/supabase/middleware.ts` (add suspension check)
- `apps/web/app/login/actions.ts` (add rate limit to `sendOtp`)
- `apps/web/app/login/check/actions.ts` (add rate limit to `verifyCode`/`resendOtp`;
  add suspension check + signout on `verifyCode` success)
- `apps/web/app/auth/confirm/route.ts` (add suspension check + signout after verify)
- Test files for the two new lib helpers (if plan 002 landed)
- `plans/README.md` (status update)

**Out of scope**:
- The admin panel UI that *sets* `suspended_at` (separate, post-MVP).
- Building a full sliding-window limiter or adding Redis — fixed-window in
  Postgres is the chosen scope.
- Changing the banned-email gate (already works).

## Git workflow

- Branch: `advisor/004-suspension-rate-limit`
- Commits: migration+types; suspension enforcement; rate limiting. Plain
  subjects, **no AI-attribution trailers**.
- Do NOT push / open a PR unless instructed.

## Steps

### Step 1: Rate-limit table migration

Create `supabase/migrations/<ts>_auth_rate_limits.sql`:

```sql
-- Fixed-window rate limiter for unauthenticated auth actions (OTP send/verify).
-- Written/read only by the server via the service-role key, so RLS denies all
-- access to anon/authenticated (no policies = no access under RLS).
create table if not exists public.auth_rate_limits (
  scope text not null,
  key text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (scope, key)
);
alter table public.auth_rate_limits enable row level security;
-- No policies: only service_role (which bypasses RLS) can touch it.
grant select, insert, update, delete on public.auth_rate_limits to service_role;
```

**Verify**: apply via MCP; `list_migrations` shows it.

### Step 2: Regenerate types

MCP `generate_typescript_types` → overwrite `packages/api/src/database.types.ts`.

**Verify**: `grep -n "auth_rate_limits" packages/api/src/database.types.ts` → match.

### Step 3: Rate-limit helper

Create `apps/web/lib/auth/rate-limit.ts`. Server-only; uses `createAdminClient`.
Fixed window: if the stored window is older than `windowSec`, reset; else
increment; return whether `count` exceeds `max`.

```ts
import { createAdminClient } from "@/lib/supabase/admin";

/** Returns true if the action is allowed, false if the limit is exceeded.
 *  Fail-open on storage errors (don't lock users out if the limiter breaks). */
export async function checkRateLimit(
  scope: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = Date.now();
  try {
    const { data } = await admin
      .from("auth_rate_limits")
      .select("window_start, count")
      .eq("scope", scope)
      .eq("key", key)
      .maybeSingle();

    const windowStart = data ? new Date(data.window_start).getTime() : 0;
    const expired = now - windowStart > windowSec * 1000;
    const nextCount = data && !expired ? data.count + 1 : 1;
    const nextWindowStart = data && !expired ? new Date(windowStart) : new Date(now);

    await admin.from("auth_rate_limits").upsert({
      scope,
      key,
      window_start: nextWindowStart.toISOString(),
      count: nextCount,
    });
    return nextCount <= max;
  } catch {
    return true; // fail open
  }
}
```

Suggested limits (use these constants in the callers):
- `sendOtp` / `resendOtp`: scope `"otp_send"`, key = email, `max = 5`, window
  `900` (15 min).
- `verifyCode`: scope `"otp_verify"`, key = email, `max = 10`, window `900`.

**Verify**: typecheck after Step 5.

### Step 4: Suspension helper

Create `apps/web/lib/auth/suspension.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";

/** True if the user's profile is suspended. Uses the admin client so it works
 *  in the pre-redirect login path and isn't subject to own-row RLS timing. */
export async function isSuspended(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("suspended_at")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.suspended_at);
}
```

### Step 5: Wire suspension + rate limits into the auth actions

In `apps/web/app/login/actions.ts` `sendOtp`, after the email validation and
before `signInWithOtp`:
```ts
if (!(await checkRateLimit("otp_send", email, 5, 900))) return { error: GENERIC_ERROR };
```
(Keep returning the existing `GENERIC_ERROR` so rate-limit state isn't disclosed —
consistent with the no-enumeration design.)

In `apps/web/app/login/check/actions.ts`:
- `verifyCode`: before `verifyOtp`, add
  `if (!(await checkRateLimit("otp_verify", email, 10, 900))) return { error: "..." };`
  After a successful `verifyOtp`, fetch the user and check suspension:
  ```ts
  const { data: { user } } = await supabase.auth.getUser();
  if (user && (await isSuspended(user.id))) {
    await supabase.auth.signOut();
    return { error: "This account has been suspended. Contact support." };
  }
  redirect("/home");
  ```
- `resendOtp`: add `if (!(await checkRateLimit("otp_send", email, 5, 900))) return { error: "..." };`
  before `signInWithOtp`.

In `apps/web/app/auth/confirm/route.ts`, after a successful `verifyOtp` and before
redirecting to `/home`:
```ts
const { data: { user } } = await supabase.auth.getUser();
if (user && (await isSuspended(user.id))) {
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=suspended", request.url));
}
```

In `apps/web/lib/supabase/middleware.ts`, after the `getUser()` call, when a user
exists and the route is NOT public, check suspension and eject:
```ts
if (user && !isPublic(request.nextUrl.pathname)) {
  // (import isSuspended at top; it uses the admin client)
  if (await isSuspended(user.id)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "suspended");
    // clear the session so they don't loop
    await supabase.auth.signOut();
    return NextResponse.redirect(url);
  }
}
```
> Keep the existing "Do NOT put logic between createServerClient and getUser()"
> rule — the suspension check goes AFTER `getUser()`, which is fine.

**Verify**: `pnpm typecheck` → exit 0; `pnpm --filter @wavetap/web build` → exit 0.

### Step 6: Tests (if plan 002 landed)

Create `apps/web/lib/auth/rate-limit.test.ts` and (optionally)
`suspension.test.ts`, mocking `@/lib/supabase/admin`:
- rate-limit: allows up to `max`, denies on `max+1`, resets after window expiry,
  fails open when the admin query throws.
- suspension: true when `suspended_at` set, false when null/no row.

**Verify**: `pnpm --filter @wavetap/web test` → pass.

## Test plan

- `rate-limit.test.ts`: within-limit allow, over-limit deny, window reset,
  fail-open. Mock the admin client's `.from().select().eq().eq().maybeSingle()`
  chain and `.upsert()`.
- `suspension.test.ts`: suspended vs active.
- Pattern: Vitest `vi.mock("@/lib/supabase/admin", ...)`.
- Verification: `pnpm --filter @wavetap/web test` → all pass.

## Done criteria

ALL must hold:
- [ ] `auth_rate_limits` table migration applied (in `list_migrations`); RLS enabled, no anon/authenticated policies.
- [ ] Types regenerated; table present in `database.types.ts`.
- [ ] `lib/auth/suspension.ts` and `lib/auth/rate-limit.ts` exist.
- [ ] `sendOtp`, `resendOtp`, `verifyCode` each call `checkRateLimit`.
- [ ] `verifyCode` success, `/auth/confirm` success, and middleware each check `isSuspended` and sign out + redirect when suspended.
- [ ] `pnpm typecheck` exits 0; `pnpm --filter @wavetap/web build` exits 0.
- [ ] Tests pass (or deferral noted if plan 002 not landed).
- [ ] No out-of-scope files modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report (do not improvise) if:
- Plan 001 has NOT landed (a user can still clear their own `suspended_at`) —
  enforcement is bypassable; flag the dependency and confirm with the operator
  before proceeding, or proceed but note the gap prominently.
- The middleware suspension check measurably breaks the public/landing routes
  (it must only run for authenticated users on protected paths — re-read the
  guard).
- `createAdminClient` is unavailable in the middleware runtime (Edge vs Node) —
  Next middleware runs on the Edge runtime by default and the service-role client
  uses `@supabase/supabase-js` which should work, but if it errors at runtime,
  STOP and report (may need the suspension check moved out of middleware into a
  per-page `requireUser` enhancement instead).
- Suspension lookups add obvious latency to every request in local testing —
  report; the cookie-cache optimization (Maintenance notes) may be needed.

## Maintenance notes

- **Edge-runtime caveat**: if the middleware suspension check causes Edge-runtime
  issues, move it into `lib/auth/profile.ts`'s `requireUser` (Node runtime, runs
  in every protected page/action) instead — slightly less immediate but avoids
  Edge constraints.
- **Optimization deferred**: to avoid a `profiles` lookup per request, the
  suspension state can be cached in a short-TTL signed cookie set at login and
  re-validated periodically. Only do this if profiling shows the per-request
  lookup matters.
- **Rate limiter is fixed-window** (not sliding) and per-email (not per-IP).
  Adequate for current scale; revisit (per-IP, sliding window, or Supabase
  dashboard limits) if abuse patterns emerge.
- **Reviewer should scrutinize**: that suspended users are signed out (not just
  redirected with a live session), and that rate-limit failures return the
  generic non-enumerating error.
- **Cleanup**: `auth_rate_limits` rows accumulate. Add a periodic delete of rows
  with `window_start` older than a day (a Supabase scheduled function) — deferred,
  low urgency at current volume.
