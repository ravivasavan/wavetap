# WaveTap — Notifications

## Principles

- **User-controlled** — Every user chooses their notification channels (email, push, SMS — any combination)
- **Visual-first** — No audio alerts. All notifications produce visual output.
- **Minimal** — Only notify when something requires attention or action. No marketing, no engagement nudges.

## Channels

| Channel | Technology | Launch Status |
|---------|-----------|--------------|
| Email | Resend | ✅ Launch |
| Native push (iOS + Android) | Expo Notifications (APNs + FCM) | ✅ Launch |
| In-app | Notification bell + badge counter (web + native) | ✅ Launch |
| Web push (browser) | Web Push API / Service Worker | 🔜 Post-launch — native is the primary mobile push surface |
| SMS | Twilio or MessageMedia | 🔜 Post-launch (budget dependent) |

Users enable/disable each channel independently in their profile settings.

## Notification Events

### For Signers

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

The primary push surface is the **native app**, via **Expo Notifications** (which fronts APNs on iOS and FCM on Android with one API). Web push is deferred to post-launch.

- User grants permission during onboarding (non-intrusive prompt, not on first load)
- On grant, the app obtains an **Expo push token** and stores it in a `push_tokens` table, keyed by user + device
- A Supabase Edge Function sends to the [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/) when events occur
- Notifications display as native OS notifications with the WaveTap icon; tapping deep-links into the relevant screen (Expo Router)
- Stale/invalid tokens reported by Expo (`DeviceNotRegistered`) are pruned from `push_tokens`

```sql
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, expo_push_token)
);
```

> When web push lands post-launch, browser subscriptions are stored as `platform = 'web'` rows (with the subscription payload in a dedicated column) so dispatch logic stays uniform.

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
3. **For each recipient:** check their notification preferences, then send via enabled channels — Resend (email) and the Expo Push API (one request batching all of that user's device tokens from `push_tokens`)
4. **Insert record** into `notifications` table for in-app display (rendered on web and native)

## Rate Limiting

- A signer with a popular booking might generate many "interest received" notifications. These are batched: if 3+ interests arrive within 5 minutes, they are grouped into a single notification: "[3] interpreters are available for your booking on [date]"
- No more than 1 push notification per event type per 5-minute window per user

## Quiet Hours

Not at launch, but a future consideration: allow users to set quiet hours during which push notifications are held and delivered as a batch summary.
