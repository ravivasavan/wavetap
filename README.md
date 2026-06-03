# WaveTap

**Wave. Tap. Book.**

> Peer-to-peer platform connecting Deaf and Hard of Hearing individuals with Auslan interpreters. No agencies, no middlemen — just match, then hand off. Australia · [wavetap.app](https://wavetap.app)

A neutral aggregator: we connect signers and interpreters, then step aside. All coordination, invoicing, and payment happens off-platform between the two parties.

## Documents

Read these in order. Each builds on the previous.

| # | Document | Description |
|---|----------|-------------|
| 01 | [Project Overview](./01_PROJECT_OVERVIEW.md) | Vision, principles, what WaveTap is and isn't |
| 02 | [User Roles & Profiles](./02_USER_ROLES_AND_PROFILES.md) | Signer and Interpreter roles, dual-role accounts, profile fields |
| 03 | [Booking Flow](./03_BOOKING_FLOW.md) | The complete lifecycle: Wave → Tap → Book |
| 04 | [Tech Stack](./04_TECH_STACK.md) | Architecture, infrastructure, cost projection |
| 05 | [Data Model](./05_DATA_MODEL.md) | Database schema, tables, RLS, indexes |
| 06 | [Auth, Security & Privacy](./06_AUTH_SECURITY_PRIVACY.md) | Magic link, privacy principles, account deletion, ToS |
| 07 | [Admin Panel](./07_ADMIN_PANEL.md) | Moderation tools, analytics dashboard, audit log |
| 08 | [Accessibility](./08_ACCESSIBILITY.md) | WCAG 2.1 AA + Deaf-specific UX principles |
| 09 | [Design System](./09_DESIGN_SYSTEM.md) | Colours, typography, spacing, components, brand voice |
| 10 | [Notifications](./10_NOTIFICATIONS.md) | Channels, events, templates, dispatch logic |
| 11 | [Routes & Pages](./11_ROUTES_AND_PAGES.md) | All application routes, navigation, page structure |

## Quick Reference

- **Clients:** Responsive web (Next.js) + native iOS & Android (Expo), built simultaneously
- **Monorepo:** pnpm + Turborepo — `apps/web`, `apps/mobile`, shared `packages/*`
- **UI:** HeroUI — `@heroui-pro/react` (web) + `heroui-native` (mobile), one design language
- **Backend:** Supabase (PostgreSQL + RLS, Auth, Realtime, Edge Functions, Storage)
- **Auth:** Magic link (passwordless)
- **Hosting:** Vercel (web) + EAS / App Store + Google Play (native)
- **Notifications:** Resend (email) + Expo Notifications (native push)
- **Language:** Auslan (multi-language infrastructure)
- **Geography:** Australia
- **Domain:** wavetap.app

## For AI-assisted development

These documents are designed to be loaded as project context (Cursor, Claude Code, etc.). When starting a new feature or component:

1. Reference the relevant doc(s) for requirements
2. Follow the design system tokens for all UI work — they are shared across web and native
3. Seed UI from HeroUI via the **HeroUI MCP** (`@heroui-pro/react` on web, `heroui-native` on mobile), then refine against the design system and accessibility docs
4. Follow the data model for any database interactions
5. Follow the accessibility checklist before shipping — on web *and* native
6. Follow the booking flow states for any booking-related logic
7. Put platform-agnostic logic in `packages/core` / `packages/api` so both clients share it

The docs are the source of truth. If the code diverges from the docs, update one or the other — don't let them drift.

---

**GitHub repo description** (paste into *About* → *Description*):  
`Peer-to-peer platform connecting Signers with Auslan interpreters. Wave. Tap. Book. — wavetap.app`
