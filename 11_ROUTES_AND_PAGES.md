# WaveTap — Routes & Pages

## Overview

WaveTap is a single Next.js application serving three experiences through the same deployment:

1. **Signer experience** — Creating and managing bookings
2. **Interpreter experience** — Browsing and responding to bookings
3. **Admin experience** — Moderation and analytics

The active role determines what the user sees. Route structure uses Next.js App Router.

## Public Routes (No Auth)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, tagline (Wave. Tap. Book.), value proposition, CTA to sign up/log in |
| `/login` | Auth | Email input for magic link. Simple, single-field form. |
| `/auth/callback` | Auth callback | Handles magic link redirect, creates session |
| `/terms` | Terms of Service | Static page. Neutral aggregator disclaimer. |
| `/privacy` | Privacy Policy | Static page. |

## Onboarding (Authenticated, First Visit)

| Route | Page | Description |
|-------|------|-------------|
| `/onboarding/role` | Role selection | "I am a Signer", "I am an Interpreter", "Both" |
| `/onboarding/profile` | Profile setup | Stepped form — name, location, sign languages, contact preference |
| `/onboarding/interpreter` | Interpreter setup | If interpreter role — working radius, availability pattern, bio |
| `/onboarding/notifications` | Notification preferences | Enable push, confirm email, optional SMS |
| `/onboarding/terms` | Accept ToS | Must accept before proceeding |

## Signer Routes

| Route | Page | Description |
|-------|------|-------------|
| `/home` | Dashboard | Active bookings summary, quick "Create Booking" CTA |
| `/bookings/new` | Create Booking | Stepped form — title, date/time, mode, location, notes |
| `/bookings/[id]` | Booking Detail | Status, interested interpreters list, confirm/cancel actions |
| `/bookings` | My Bookings | List of all bookings (open, confirmed, past) with filters |
| `/bookings/[id]/select` | Select Interpreter | Review interested interpreters, select one or more, confirm |

## Interpreter Routes

| Route | Page | Description |
|-------|------|-------------|
| `/pool` | Booking Pool | Feed of open bookings matching location/availability. Primary interpreter view. |
| `/pool/[id]` | Booking Detail | View booking details, express interest button |
| `/my-bookings` | My Confirmed Bookings | List of bookings the interpreter has been selected for |
| `/availability` | Availability Settings | Set/edit weekly availability pattern |

## Shared Routes (Both Roles)

| Route | Page | Description |
|-------|------|-------------|
| `/profile` | My Profile | View/edit profile, switch active role |
| `/profile/edit` | Edit Profile | Form to update all profile fields |
| `/settings` | Settings | Notification preferences, account management |
| `/settings/notifications` | Notification Settings | Toggle email/push/SMS per channel |
| `/settings/delete-account` | Delete Account | Confirmation flow, hard delete |
| `/notifications` | Notification Centre | Full notification list, mark read, navigate to source |

## Admin Routes

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Dashboard | Analytics overview — live metrics, charts |
| `/admin/users` | User Management | Search, list, filter users |
| `/admin/users/[id]` | User Detail | Full profile, activity log, suspend/ban actions |
| `/admin/reports` | Report Queue | Flagged users, filter by status |
| `/admin/reports/[id]` | Report Detail | Full report context, admin actions |
| `/admin/bookings` | Booking Oversight | All bookings, filter by status/date/region |
| `/admin/bookings/[id]` | Booking Detail (Admin) | Full booking view with admin actions |

## Navigation Structure

### Desktop (Top Bar)

**Signer active:**
```
[Logo]   Home   My Bookings   [Bell Icon]   [Avatar ▼]
                                              Profile
                                              Settings
                                              Switch to Interpreter
                                              Log out
```

**Interpreter active:**
```
[Logo]   Pool   My Bookings   Availability   [Bell Icon]   [Avatar ▼]
                                                            Profile
                                                            Settings
                                                            Switch to Signer
                                                            Log out
```

### Mobile (Bottom Tab Bar)

**Signer active:**
```
[Home]   [+ New]   [My Bookings]   [Notifications]   [Profile]
```

**Interpreter active:**
```
[Pool]   [My Bookings]   [Availability]   [Notifications]   [Profile]
```

## Role Switching

Users with dual roles see a role toggle in their profile menu. Switching roles changes:

- The primary navigation items
- The home/default view
- Which routes are accessible

Role switching is instant (client-side state + database update to `active_role`). No logout/re-login required.

## Page Layout Pattern

Every main page follows the same structure:

```
┌──────────────────────────────────────┐
│  Top Nav (fixed)                     │
├──────────────────────────────────────┤
│                                      │
│  Page Header                         │
│  (Title + optional subtitle/action)  │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  Content Area                        │
│  (Cards, lists, forms)               │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  Bottom Tab Bar (mobile only)        │
└──────────────────────────────────────┘
```

## Loading & Empty States

Every page/component has three visual states:

1. **Loading** — Skeleton screen matching the content layout (no spinners)
2. **Empty** — Warm illustration + helpful copy + CTA ("No bookings yet — create your first one")
3. **Populated** — Content
