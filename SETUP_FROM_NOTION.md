# WaveTap — Initial Setup Steps (from Notion)

Pulled from your Notion workspace via the Notion MCP. Your **Phases** and **Tasks** define the following sequence.

---

## Phase 00 — Accounts, Domain & Tooling

**Goal:** Every external service is ready before you write a line of code.  
**Effort:** 1–2 hours

### Tasks (from Notion Tasks database)

- **Create private GitHub repo (wavetap)** — e.g. `github.com/your-org/wavetap`
- **Register wavetap.app domain** — .app TLD enforces HTTPS
- **Create a Vercel account** — Sign up with GitHub. Don’t deploy yet.
- (Implicit from Phase 01 / Tech Stack: create **Supabase** project, **Resend** account; optionally **Sentry**)

### Notes (from Notion)

- **Supabase free tier:** 500MB database, 1GB storage, 50k auth users, 500k Edge Function invocations/month
- **Resend free tier:** 3,000 emails/month, 100/day
- **Sentry free tier:** 5k errors/month
- **VAPID keys** (for Web Push) are generated later in Phase 6

---

## Phase 01 — Project Scaffold

**Goal:** A deployed Next.js app with Tailwind configured to WaveTap design tokens, Supabase wired up, and a working “hello world” on wavetap.app.  
**Effort:** 3–5 hours  
**Depends on:** Phase 00

### Tasks

1. **Initialise the project** — Next.js 14+ (App Router), repo cloned/created
2. **Configure Tailwind with design tokens** — Use `09_DESIGN_SYSTEM.md` (colours, typography, spacing, shadows, components)
3. **Environment variables** — `.env.local` with Supabase URL/keys, `NEXT_PUBLIC_APP_URL`, later Resend
4. **Install dependencies** — Tailwind, Radix/shadcn, Supabase client, etc.
5. **Supabase client utilities** — Browser and server clients, auth callback route
6. **Basic layout and landing page** — Root layout, landing with “Wave. Tap. Book.” and CTA
7. **Deploy** — Connect GitHub repo to Vercel, configure custom domain (wavetap.app)

### Cursor context (when prompting for this phase)

- `09_DESIGN_SYSTEM.md` — colour tokens, typography, spacing, shadows, components
- `04_TECH_STACK.md` — stack decisions, architecture

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
| 08 | Navigation & Responsive Design |
| 09 | PWA & Offline |
| 10 | Polish & Pre-Launch |
| 11 | Soft Launch |

---

## Quick reference (from Wavetap hub)

- **Stack:** Next.js 14+ · Supabase · Vercel · Resend  
- **Auth:** Magic link (passwordless)  
- **Database:** PostgreSQL with RLS  
- **Hosting:** Vercel (free tier)  
- **Mobile:** PWA (no native app)  
- **Language:** Auslan (multi-language ready)  
- **Geography:** Australia  
- **Domain:** wavetap.app  
- **Monthly cost:** ~\$1.20/month (Vercel \$0, Supabase \$0, Resend \$0, Web Push \$0, domain ~\$1.20)

---

*This file was generated from your Notion workspace. Update it by re-pulling from Notion or by editing the phase/task pages in Notion.*
