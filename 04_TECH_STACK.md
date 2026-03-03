# WaveTap — Tech Stack & Architecture

## Guiding Principles

- **Cost economy** — Self-funded project. $0/month at launch, scaling affordably with traction.
- **Simplicity** — Minimal moving parts. One framework, one database, one hosting provider.
- **Speed to launch** — Favour managed services and conventions over custom infrastructure.
- **Future-ready** — Architecture should support mobile native apps and multi-region expansion without rewriting.

## Stack

### Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 14+ (App Router)** | React-based, server-side rendering, API routes built in, excellent Vercel integration |
| Styling | **Tailwind CSS** | Utility-first, fast iteration, consistent design tokens |
| UI Components | **Radix UI** or **shadcn/ui** | Accessible primitives out of the box, unstyled/customisable |
| PWA | **next-pwa** or **Serwist** | Service worker, install prompt, offline shell, push notifications |
| State | **React Context + Supabase Realtime** | Minimal client state — most data flows from Supabase subscriptions |

### Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Database | **Supabase (PostgreSQL)** | Free tier generous, built-in auth, realtime subscriptions, Row Level Security, file storage |
| Auth | **Supabase Auth** | Magic link (email) at launch. OAuth (Google, Apple) can be added later with minimal effort |
| Realtime | **Supabase Realtime** | Postgres changes broadcast to clients — powers live booking pool updates and notifications |
| Edge Functions | **Supabase Edge Functions (Deno)** | Serverless functions for notification dispatch, cron jobs (expiry checks), admin operations |
| File Storage | **Supabase Storage** | Profile photos. S3-compatible, integrated with RLS |

### Hosting & Deployment

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Hosting | **Vercel (free tier)** | Optimised for Next.js, global CDN, preview deployments, analytics |
| Domain | **wavetap.app** | .app TLD enforces HTTPS by default |
| DNS | **Vercel DNS** or **Cloudflare (free)** | Simple, reliable |

### Notifications

| Channel | Technology | Rationale |
|---------|-----------|-----------|
| Email | **Resend (free tier)** | 3,000 emails/month free, clean API, React Email templates |
| Push | **Web Push API** via service worker | Native browser push, no third-party dependency |
| SMS | **Twilio** or **MessageMedia (AU)** | Added when budget allows. SMS is optional at launch — email and push first |

### Monitoring & Error Tracking

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Error tracking | **Sentry (free tier)** | Captures frontend and edge function errors |
| Analytics | **Vercel Analytics** or **Plausible** | Privacy-respecting, lightweight, no cookie banners needed |
| Uptime | **Better Uptime (free tier)** | Simple status page and alerts |

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│                   Client                     │
│          Next.js PWA (Vercel)                │
│     ┌──────────┬──────────┬────────────┐     │
│     │  Signer  │  Terp    │   Admin    │     │
│     │   Views  │  Views   │  Dashboard │     │
│     └────┬─────┴────┬─────┴─────┬──────┘     │
└──────────┼──────────┼───────────┼────────────┘
           │          │           │
           ▼          ▼           ▼
┌─────────────────────────────────────────────┐
│              Supabase                        │
│  ┌──────────┬───────────┬──────────────┐     │
│  │ Auth     │ Postgres  │  Realtime    │     │
│  │(Magic    │ (RLS)     │ (Live pool   │     │
│  │ Link)    │           │  updates)    │     │
│  ├──────────┼───────────┼──────────────┤     │
│  │ Storage  │ Edge      │              │     │
│  │(Photos)  │ Functions │              │     │
│  └──────────┴───────────┴──────────────┘     │
└─────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Resend (Email)     │
│  Web Push (Browser) │
│  Twilio (SMS later) │
└─────────────────────┘
```

## Cost Projection

### Phase 1: Launch (0–500 users)

| Service | Monthly Cost |
|---------|-------------|
| Vercel | $0 (free tier) |
| Supabase | $0 (free tier — 500MB DB, 1GB storage, 50k auth users) |
| Resend | $0 (3,000 emails/month) |
| Web Push | $0 (browser-native) |
| Domain (wavetap.app) | ~$14/year |
| **Total** | **~$1.20/month** |

### Phase 2: Growth (500–5,000 users)

| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20/month |
| Supabase Pro | $25/month |
| Resend | $20/month (50k emails) |
| SMS (Twilio/MessageMedia) | Usage-based, ~$20–50/month |
| **Total** | **~$85–115/month** |

## Environment Configuration

```
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
RESEND_API_KEY=xxx
NEXT_PUBLIC_APP_URL=https://wavetap.app
```

## Key Technical Decisions

1. **Supabase Row Level Security (RLS)** is the primary access control layer. Every table has RLS policies — no data is accessible without proper auth context.
2. **Realtime subscriptions** power the booking pool. When a new booking is created, interpreters see it appear live without polling.
3. **Edge Functions** handle side effects: sending notifications, checking booking expiry, processing account deletions.
4. **No separate backend API.** Next.js API routes + Supabase Edge Functions handle all server-side logic. No Express, no standalone server.
5. **PWA over native.** The web app installs to home screen, sends push notifications, and works offline for cached content. Native apps (React Native) are a future phase if needed.
