# WaveTap — Setup & Build Plan

The authoritative setup checklist and build phase order. Originally seeded from the Notion workspace, but **this file — not Notion — is now canonical**; the Notion source is stale and should be re-synced from here, not the other way around.

> **Post-pivot (2026-06-03):** The original plan assumed a single Next.js PWA. WaveTap now ships **web + native (Expo) simultaneously from a pnpm + Turborepo monorepo on HeroUI** — see `04_TECH_STACK.md` and the [[2026-06-03-monorepo-simultaneous-native]] decision. Phases below reflect that.

---

## Phase 00 — Accounts, Domain & Tooling

**Goal:** Every external service is ready before you write a line of code.  
**Effort:** 1–2 hours

### Tasks (from Notion Tasks database)

- **Create private GitHub repo (wavetap)** — e.g. `github.com/your-org/wavetap` (monorepo)
- **Register wavetap.app domain** — .app TLD is HSTS-preloaded (HTTPS mandatory); also the native app-link/universal-link domain
- **Manage DNS at Cloudflare (free)** — point apex/`www` to Vercel (**DNS-only / grey cloud**); add Resend **SPF + DKIM + DMARC** records for email deliverability (load-bearing — magic link + OTP are the whole auth path). See [[2026-06-03-dns-cloudflare-email-deliverability]]
- **Create a Vercel account** — Sign up with GitHub. Don’t deploy yet. (Web only.)
- **Create an Expo account + install EAS CLI** — for native iOS/Android builds and submission
- **Enrol in the Apple Developer Program** ($99/year) — required for TestFlight + App Store
- **Create a Google Play Console account** ($25 one-time) — required for Play distribution
- (Implicit from Phase 01 / Tech Stack: create **Supabase** project, **Resend** account; optionally **Sentry**)

### Notes (from Notion)

- **Supabase free tier:** 500MB database, 1GB storage, 50k auth users, 500k Edge Function invocations/month
- **Resend free tier:** 3,000 emails/month, 100/day
- **Sentry free tier:** 5k errors/month
- **Push credentials** are configured in the notifications phase: APNs key (iOS) + FCM (Android) registered with Expo via EAS. (VAPID keys for web push only if/when web push is picked up post-launch.)

---

## Phase 01 — Monorepo Scaffold (Web + Native)

**Goal:** A pnpm + Turborepo monorepo with `apps/web` (Next.js 15 + HeroUI Pro) and `apps/mobile` (Expo + heroui-native) both rendering a token-themed “Wave. Tap. Book.” starter, sharing `packages/tokens`, with Supabase wired up. Web deployed to wavetap.app; native running in Expo Go / a dev build.  
**Effort:** 6–10 hours  
**Depends on:** Phase 00

### Tasks

1. **Initialise the monorepo** — pnpm workspaces + Turborepo; `apps/web`, `apps/mobile`, `packages/{tokens,core,api,config}`
2. **Build `packages/tokens`** — compile `design-tokens/` (W3C DTCG) into a shared theme consumable by Tailwind v4 (web) and Uniwind/heroui-native (mobile)
3. **Scaffold `apps/web`** — Next.js 15 + React 19 + Tailwind v4 + `@heroui-pro/react`/`@heroui/react`; seed initial UI via the **HeroUI MCP**
4. **Scaffold `apps/mobile`** — Expo (managed) + Expo Router + `heroui-native` + Uniwind; seed initial screens via the **HeroUI MCP**
5. **Environment variables** — `apps/web/.env.local` and `apps/mobile/.env` (Supabase URL/anon key, app URL); EAS secrets for native
6. **Shared Supabase utilities** — `packages/api`: typed browser/server clients + generated DB types; auth callback (web) + deep-link auth (native)
7. **Deploy web** — Connect GitHub repo to Vercel (root = `apps/web`), configure custom domain (wavetap.app)
8. **Native dev build** — `eas build --profile development` for at least one platform; confirm the app boots and renders tokens

### AI context (when prompting for this phase)

- `04_TECH_STACK.md` — monorepo layout, HeroUI packages, Expo, MCP seeding
- `09_DESIGN_SYSTEM.md` — shared tokens, HeroUI conventions, components
- The **HeroUI MCP** — pull component docs/source, theme variables, and CSS for both packages

---

## Full phase order (from Notion Phases)

| Phase | Title |
|-------|--------|
| 00 | Accounts, Domain & Tooling |
| 01 | Project Scaffold |
| 02 | Database Schema |
| 03 | Auth & Onboarding |
| 04 | Core Booking Flow |
| 05 | Profiles, Settings & Role Switching |
| 06 | Notifications |
| 07 | Admin Panel |
| 08 | Navigation & Responsive Design (web top-bar + native/mobile tabs) |
| 09 | Native Builds & Store Submission (EAS → TestFlight + Play) |
| 10 | Polish & Pre-Launch |
| 11 | Soft Launch |

---

## Quick reference (from Wavetap hub)

- **Clients:** Web (Next.js 15) + native iOS/Android (Expo), built together  
- **Monorepo:** pnpm + Turborepo — `apps/web`, `apps/mobile`, `packages/*`  
- **UI:** HeroUI — `@heroui-pro/react` (web) + `heroui-native` (mobile), shared tokens  
- **Backend:** Supabase (PostgreSQL + RLS, Auth, Realtime, Edge Functions, Storage)  
- **Auth:** Magic link (passwordless)  
- **Hosting:** Vercel (web) · EAS → App Store + Google Play (native)  
- **Notifications:** Resend (email) · Expo Notifications (native push)  
- **Language:** Auslan (multi-language ready)  
- **Geography:** Australia  
- **Domain:** wavetap.app  
- **Cost:** ~\$1.20/month infra + Apple \$99/yr + Google Play \$25 one-time (Vercel/Supabase/Resend/EAS free tiers at launch)

---

*Canonical here. If the phase plan changes, edit this file and push the change down to Notion — not the reverse.*
