# WaveTap — Notifications

## Principles

- **User-controlled** — Every user chooses their notification channels (email, push, SMS — any combination)
- **Visual-first** — No audio alerts. All notifications produce visual output.
- **Minimal** — Only notify when something requires attention or action. No marketing, no engagement nudges.

## Channels

| Channel | Technology | Launch Status |
|---------|-----------|--------------|
| Email | Resend | ✅ Launch |
| Push (browser) | Web Push API / Service Worker | ✅ Launch |
| SMS | Twilio or MessageMedia | 🔜 Post-launch (budget dependent) |
| In-app | Notification bell + badge counter | ✅ Launch |

Users enable/disable each channel independently in their profile settings.

## Notification Events

### For Deaf/HoH Users (Signers)

| Event | Message | Priority |
|-------|---------|----------|
| Interpreter expressed interest | "[Name] is available for your booking on [date]" | High |
| Booking confirmed (summary) | "Your booking on [date] is confirmed. [Name]'s contact: [detail]" | High |
| Booking expired | "Your booking on [date] has expired with no confirmation" | Medium |
| Account flagged by admin | "Your account has been temporarily suspended. Contact support." | High |

### For Interpreters

| Event | Message | Priority |
|-------|---------|----------|
| New booking in area | "New booking request on [date] in [area/remote]" | High |
| Selected for booking | "You've been selected for a booking on [date]. [Name]'s contact: [detail]" | High |
| Booking filled (not selected) | "The booking on [date] has been filled" | Low |
| Booking cancelled by signer | "The booking on [date] has been cancelled by the requester" | Medium |
| Account flagged by admin | "Your account has been temporarily suspended. Contact support." | High |

## Email Templates

Built with **React Email** (compatible with Resend). All emails follow the WaveTap design system:

- Warm neutral background
- WaveTap logo at top
- Clear heading stating the event
- Relevant details (date, time, mode, contact info where applicable)
- Single CTA button linking to the relevant screen in the app
- Minimal footer with unsubscribe/notification preferences link

**No HTML-heavy templates.** Emails should be clean, readable, and render well in all clients including plain text fallback.

## Push Notifications

Implemented via the Web Push API and service worker (PWA):

- User grants permission during onboarding (non-intrusive prompt, not on first load)
- Push subscription is stored in a `push_subscriptions` table
- Supabase Edge Function sends push via Web Push protocol when events occur
- Notifications display as native browser/OS notifications with the WaveTap icon

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now()
);
```

## In-App Notifications

- Bell icon in the top navigation with unread count badge
- Notification panel slides in from the right (or full-screen on mobile)
- Each notification shows: icon (by type), title, timestamp, read/unread state
- Tapping a notification marks it as read and navigates to the relevant screen
- "Mark all as read" action available

## Notification Dispatch Logic

Notifications are dispatched by Supabase Edge Functions triggered by database changes:

1. **Database trigger** fires on insert to `booking_interests`, `booking_confirmations`, or status change on `bookings`
2. **Edge Function** receives the event, determines recipients and notification type
3. **For each recipient:** check their notification preferences, send via enabled channels
4. **Insert record** into `notifications` table for in-app display

## Rate Limiting

- A signer with a popular booking might generate many "interest received" notifications. These are batched: if 3+ interests arrive within 5 minutes, they are grouped into a single notification: "[3] interpreters are available for your booking on [date]"
- No more than 1 push notification per event type per 5-minute window per user

## Quiet Hours

Not at launch, but a future consideration: allow users to set quiet hours during which push notifications are held and delivered as a batch summary.
