# WaveTap — Tech Stack & Architecture

## Guiding Principles

- **Cost economy** — Self-funded project. Near-$0/month for infrastructure at launch (store developer fees aside), scaling affordably with traction.
- **One design language, two clients** — Web and native share a single design system, design tokens, and product spec. Implementation differs per platform; the experience does not.
- **Speed to launch** — Favour managed services and conventions over custom infrastructure. Seed UI from HeroUI Pro via MCP rather than hand-building primitives.
- **Future-ready** — Multi-region and multi-language expansion without rewriting.

## Platform Strategy

WaveTap ships **two clients simultaneously** from a single monorepo:

1. **Web** — A responsive React app (Next.js). Desktop and mobile browsers. This is also where the **admin panel** lives.
2. **Native** — iOS and Android apps built with **Expo (React Native)**. This is the primary mobile experience — no PWA.

Both are built on **HeroUI** so they share a design language, tokens, and component vocabulary:

- **Web:** `@heroui-pro/react` + `@heroui/react` (React, Tailwind CSS v4)
- **Native:** `heroui-native` (React Native, styled via Uniwind)

> **Supersedes** the earlier "PWA only, no native app at launch" position and the "start native after web reaches Phase 04" timing in the original native-scope note. Web and native are now first-class from day one.

## Stack

### Monorepo

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Package manager | **pnpm** (workspaces) | Fast, disk-efficient, first-class monorepo support |
| Task runner | **Turborepo** | Cached, parallel builds across `web`, `mobile`, and shared packages |
| Structure | `apps/web`, `apps/mobile`, `packages/*` | See [Repo Layout](#repo-layout) below |

### Shared packages

| Package | Contents |
|---------|----------|
| `packages/tokens` | W3C DTCG design tokens (primitives + semantic) — the single source of truth consumed by Tailwind v4 (web) and Uniwind/heroui-native (mobile). Sourced from `design-tokens/`. |
| `packages/core` | Platform-agnostic business logic: booking state machine, validation (Zod schemas), matching/eligibility rules, date/time helpers |
| `packages/api` | Typed Supabase client wrappers + generated DB types (`supabase gen types`), shared queries/mutations |
| `packages/config` | Shared TypeScript, ESLint, Prettier config |

### Web — `apps/web`

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 15 (App Router) + React 19** | SSR, route handlers, Vercel-native, hosts the admin panel |
| Styling | **Tailwind CSS v4** | Required by HeroUI v3. Driven by `packages/tokens` |
| UI components | **`@heroui-pro/react` + `@heroui/react`** | Pro **sits on top of** OSS (`@heroui/react` + `@heroui/styles`) — install OSS first. v3 compound patterns, no Provider, `onPress` not `onClick`. 62 Pro web components. Seeded via the HeroUI MCP |
| Icons | **Lucide** (`lucide-react`) | Open source, consistent, cross-platform sibling on native |
| State | **React Context + Supabase Realtime** | Minimal client state — most data flows from Supabase subscriptions |

### Native — `apps/mobile`

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | **Expo (managed) + React Native** | Fastest path for a solo builder: EAS Build/Submit, OTA updates, managed native modules. **HeroUI Native itself is built on Expo** — choice validated by the vendor |
| Navigation | **Expo Router** | File-based routing mirroring the web route taxonomy |
| Animation | **React Native Reanimated** | Required by HeroUI Native; powers component motion |
| Styling | **Uniwind** (Tailwind-for-RN) | Lets `heroui-native` consume the same `packages/tokens` as the web Tailwind config |
| UI components | **`heroui-native` (OSS) + HeroUI Native Pro** | Native arm of HeroUI: OSS base + a **premium** Pro extension (Calendar, DatePicker, Stepper, NumberField, …). Smaller catalogue than web Pro (~a dozen Pro components vs 62) — **compose from OSS where no native-Pro equivalent exists yet** |
| Icons | **Lucide** (`lucide-react-native`) | Same icon set as web |
| Builds & submission | **EAS Build + EAS Submit** | Cloud builds, TestFlight + Play Internal Testing, store submission |
| Updates | **EAS Update** | Ship JS/asset fixes OTA without a store round-trip |

### Backend (shared by both clients)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Database | **Supabase (PostgreSQL)** | Free tier generous, built-in auth, realtime subscriptions, Row Level Security, file storage |
| Auth | **Supabase Auth** | Magic link (email) at launch, with deep-link callback handling on native. OAuth (Google, Apple) can be added later |
| Realtime | **Supabase Realtime** | Postgres changes broadcast to clients — powers live booking pool updates and notifications on both web and native |
| Edge Functions | **Supabase Edge Functions (Deno)** | Serverless functions for notification dispatch, cron jobs (expiry checks), admin operations |
| File Storage | **Supabase Storage** | Profile photos. S3-compatible, integrated with RLS |

**Project configuration** (see the [[2026-06-03-supabase-project-config]] decision): region **Sydney (`ap-southeast-2`)** for AU latency + data residency (immutable); standard **Postgres** (PostGIS-capable, not OrioleDB; immutable); **Data API on**; **auto-expose new tables off** (grant Data API access per-table in migrations); **automatic RLS on**; GitHub schema-push deploys via `ravivasavan/wavetap`.

### Hosting & Deployment

| Target | Technology | Rationale |
|--------|-----------|-----------|
| Web hosting | **Vercel (free tier)** | Optimised for Next.js, global CDN, preview deployments |
| Native builds | **EAS (Expo Application Services)** | Cloud iOS/Android builds + store submission |
| iOS distribution | **App Store / TestFlight** | Requires Apple Developer Program ($99/year) |
| Android distribution | **Google Play** | Requires Play Console (one-time $25) |
| Domain | **wavetap.app** | .app TLD is HSTS-preloaded (HTTPS mandatory); also the universal/app-link domain for native deep links |
| DNS | **Cloudflare (free)** | Single zone for Vercel web records + Resend email records. See below |

### DNS & Email Deliverability

`wavetap.app` DNS is managed at **Cloudflare (free)** — see the [[2026-06-03-dns-cloudflare-email-deliverability]] decision. The domain serves three roles:

- **Web → Vercel:** apex A `76.76.21.21`, `www` CNAME `cname.vercel-dns.com` (use the exact values Vercel shows). **Records pointing at Vercel must be DNS-only (grey cloud, not proxied).**
- **Email → Resend:** add `wavetap.app` in Resend and create the **SPF + DKIM + DMARC** records it generates. This is **load-bearing, not optional** — magic links + the OTP code are the entire auth path (`06_AUTH_SECURITY_PRIVACY.md`), so spam-foldering directly blocks sign-in. Start DMARC at `p=none` and tighten later.
- **Native app-links:** served as files from the web app (`/.well-known/apple-app-site-association`, `/assetlinks.json`) via Vercel — no DNS records needed.

### Notifications

| Channel | Technology | Rationale |
|---------|-----------|-----------|
| Email | **Resend (free tier)** | 3,000 emails/month free, clean API, React Email templates. Requires SPF/DKIM/DMARC on the domain (above) |
| Native push | **Expo Notifications** (APNs + FCM under the hood) | One API, both platforms. Device tokens stored server-side and dispatched from an Edge Function |
| Web push | **Web Push API** (service worker) | Optional / deferred — native is the primary mobile push surface, so web push is post-launch |
| SMS | **Twilio** or **MessageMedia (AU)** | Added when budget allows. Optional at launch |

### Monitoring & Error Tracking

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Error tracking | **Sentry (free tier)** | `@sentry/nextjs` (web) + `sentry-expo` (native) + edge function errors |
| Analytics | **Vercel Analytics** or **Plausible** (web); **Expo** insights (native) | Privacy-respecting, lightweight |
| Uptime | **Better Uptime (free tier)** | Simple status page and alerts |

## Repo Layout

```
wavetap/                      # pnpm + Turborepo monorepo
├── apps/
│   ├── web/                  # Next.js 15 + React 19 + Tailwind v4 + @heroui-pro/react
│   │   └── (admin panel lives here)
│   └── mobile/               # Expo + React Native + Expo Router + heroui-native
├── packages/
│   ├── tokens/               # W3C DTCG design tokens (from design-tokens/)
│   ├── core/                 # business logic, validation, booking state machine
│   ├── api/                  # typed Supabase client + generated DB types
│   └── config/               # shared TS / ESLint / Prettier
├── supabase/                 # migrations, RLS policies, Edge Functions
├── turbo.json
└── pnpm-workspace.yaml
```

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                          Clients                                │
│                                                                 │
│   apps/web (Vercel)              apps/mobile (EAS → stores)      │
│   Next.js + @heroui-pro/react    Expo RN + heroui-native        │
│   ┌────────┬────────┬───────┐    ┌──────────┬──────────┐        │
│   │ Signer │  Terp  │ Admin │    │  Signer  │   Terp   │        │
│   └───┬────┴───┬────┴───┬───┘    └────┬─────┴────┬─────┘        │
│       │        │        │             │          │              │
│   shared: packages/tokens · core · api  (design + logic)        │
└───────┼────────┼────────┼─────────────┼──────────┼─────────────┘
        ▼        ▼        ▼             ▼          ▼
┌───────────────────────────────────────────────────────────────┐
│                          Supabase                               │
│  ┌──────────┬───────────┬──────────────┐                        │
│  │ Auth     │ Postgres  │  Realtime    │                        │
│  │(Magic    │ (RLS)     │ (Live pool   │                        │
│  │ Link)    │           │  updates)    │                        │
│  ├──────────┼───────────┼──────────────┤                        │
│  │ Storage  │ Edge      │              │                        │
│  │(Photos)  │ Functions │              │                        │
│  └──────────┴───────────┴──────────────┘                        │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Resend (Email)                          │
│  Expo Notifications (APNs + FCM push)    │
│  Web Push (deferred) · Twilio (SMS later)│
└─────────────────────────────────────────┘
```

## HeroUI: licensing, install & seeding

### Licensing & install

- **OSS first, then Pro.** `@heroui-pro/react` sits on top of `@heroui/react` + `@heroui/styles`. Install OSS, then run the Pro CLI: `npx heroui-pro login` (GitHub auth) → `npx heroui-pro install` (adds `@heroui-pro/react`, downloads Pro artifacts, installs peer deps).
- **CSS import order matters** (web `globals.css`): `@import "tailwindcss";` → `@import "@heroui/styles";` → `@import "@heroui-pro/react/css";`.
- **Two tokens, two purposes.** `HEROUI_PERSONAL_TOKEN` = local dev + the HeroUI MCP (your account). `HEROUI_AUTH_TOKEN` = CI/CD; set it in Vercel **and** EAS so the postinstall step can fetch Pro artifacts at build time. Never use the personal token in CI.
- **Native Pro is a separate premium extension.** Confirm the WaveTap license entitles HeroUI Native Pro before assuming Pro-native components; otherwise the native side leans on `heroui-native` OSS.

### Seeding

The initial experience is **seeded, not hand-built**. The HeroUI MCP server covers **`@heroui-pro/react` + `@heroui/react` — both React/web** (it does *not* expose native; native Pro has its own docs + agent skills). Use it to:

- List and pull component docs/source for the surfaces in `11_ROUTES_AND_PAGES.md`
- Fetch the Pro theme variables and CSS so `packages/tokens` maps cleanly onto HeroUI's theme
- Generate first-pass **web** screens, then refine against `09_DESIGN_SYSTEM.md` and `08_ACCESSIBILITY.md`. Native screens are built from the HeroUI Native docs/skills, reusing the same tokens.

HeroUI v3 specifics the docs and code must honour: **Tailwind v4 only**, **no Provider**, **compound component patterns** (e.g. `Sheet.Trigger` / `Sheet.Content`), and **`onPress` not `onClick`**.

## Cost Projection

### Phase 1: Launch (0–500 users)

| Service | Cost |
|---------|------|
| Vercel | $0 (free tier) |
| Supabase | $0 (free tier — 500MB DB, 1GB storage, 50k auth users) |
| Resend | $0 (3,000 emails/month) |
| Expo / EAS | $0 (free tier build minutes; upgrade as needed) |
| Expo Push / Web Push | $0 |
| Apple Developer Program | $99/year |
| Google Play Console | $25 (one-time) |
| Domain (wavetap.app) | ~$14/year |
| **Recurring total** | **~$1.20/month infra + ~$9.40/month amortised store fees** |

### Phase 2: Growth (500–5,000 users)

| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20/month |
| Supabase Pro | $25/month |
| Resend | $20/month (50k emails) |
| EAS (Production plan, if needed) | ~$0–99/month depending on build volume |
| SMS (Twilio/MessageMedia) | Usage-based, ~$20–50/month |
| **Total** | **~$85–215/month** |

## Environment Configuration

The committed **`.env.example`** at the repo root is the canonical template. Copy the relevant block into the real, **git-ignored** files (`apps/web/.env.local`, `apps/mobile/.env`) — never commit real values.

```
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx          # server-only
RESEND_API_KEY=xxx                     # server-only
NEXT_PUBLIC_APP_URL=https://wavetap.app
HEROUI_PERSONAL_TOKEN=xxx              # local dev + HeroUI MCP (personal — never in CI)

# apps/mobile/.env (via Expo / EAS secrets)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_APP_URL=https://wavetap.app

# CI/CD secrets (Vercel + EAS) — NOT in any client bundle
SUPABASE_SERVICE_ROLE_KEY=xxx
RESEND_API_KEY=xxx
HEROUI_AUTH_TOKEN=xxx                  # CI/CD token — pulls Pro artifacts at build time
```

Server-only secrets (service role key, Resend key, Expo push access token) live in Edge Function / server / CI environments, never in the mobile bundle. **`HEROUI_AUTH_TOKEN`** (a license-scoped CI/CD token, rotatable from the dashboard) is required in Vercel and EAS so the postinstall step can fetch Pro components — use it in pipelines, never the personal token.

## Key Technical Decisions

1. **Web and native ship together.** A pnpm + Turborepo monorepo holds `apps/web` (Next.js) and `apps/mobile` (Expo), sharing `packages/tokens`, `packages/core`, and `packages/api`. There is no PWA — native owns the mobile experience.
2. **HeroUI is the shared design language.** `@heroui-pro/react` on web and `heroui-native` on mobile consume the same design tokens. The initial UI is seeded via the HeroUI MCP.
3. **Supabase Row Level Security (RLS)** is the primary access control layer. Every table has RLS policies — no data is accessible without proper auth context. Both clients use the same RLS.
4. **Realtime subscriptions** power the booking pool live on both web and native.
5. **Edge Functions** handle side effects: sending notifications (email + Expo push), checking booking expiry, processing account deletions.
6. **No separate backend API.** Next.js route handlers + Supabase Edge Functions handle server-side logic. The native app talks to Supabase directly (RLS-guarded) and to Edge Functions for side effects.
7. **The admin panel is web-only.** It is a protected section of `apps/web`; there is no native admin surface.
