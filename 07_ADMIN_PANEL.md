# WaveTap — Admin Panel

## Overview

The admin panel is a protected section of the web app accessible only to users with admin privileges. It provides moderation tools and an anonymised analytics dashboard. Admin status is set directly in the database — there is no self-service admin promotion.

## Access

- Route: `/admin`
- Protected by RLS + middleware check for `is_admin = true` on the profile
- Same authentication flow as regular users (magic link)
- Admin users also have normal platform access and can hold Deaf/HoH or Interpreter roles

## Moderation Tools

### User Management

- **Search users** by display name or email
- **View user profile** — all profile fields, role(s), account creation date, last active date
- **View user activity** — bookings created, interests expressed, confirmations, reports filed/received
- **Suspend account** — temporarily prevents login and hides all active bookings/interests. User is notified by email.
- **Unsuspend account** — restores full access
- **Ban email** — adds email to `banned_emails` table, immediately terminates active session, prevents future signup/login. This is the nuclear option.
- **Unban email** — removes email from `banned_emails` table

### Report Queue

- **View all reports** — filterable by status (`pending`, `reviewed`, `actioned`, `dismissed`)
- **Report detail** — shows reporter, reported user, associated booking (if any), reason text, timestamp
- **Update report status** — mark as reviewed, actioned, or dismissed
- **Add admin notes** — internal notes on the report (not visible to users)
- **Quick actions from report** — jump to suspend/ban the reported user

### Booking Oversight

- **View all bookings** — filterable by status, date range, state/region
- **View booking detail** — full booking info, list of interested interpreters, confirmation status
- **Cancel booking** — admin can cancel a booking if necessary (e.g. flagged content). Signer is notified.

## Analytics Dashboard

All data is **anonymised and aggregated**. No individual user data is displayed on the dashboard. The dashboard provides a high-level pulse of platform activity.

### Live Metrics

| Metric | Description |
|--------|-------------|
| Open requests | Number of bookings currently in `open` or `pending` status |
| Confirmed today | Bookings confirmed in the last 24 hours |
| Active users (7d) | Unique users who logged in within the last 7 days |
| Active interpreters (7d) | Users with interpreter role who logged in within the last 7 days |

### Historical Metrics

| Metric | Description |
|--------|-------------|
| Bookings per week | Line chart, last 12 weeks |
| Bookings per state | Bar chart breakdown by Australian state (NSW, VIC, QLD, WA, SA, TAS, ACT, NT) |
| Average response time | Mean time between booking creation and first interpreter interest expression |
| Average time to confirm | Mean time between booking creation and signer confirmation |
| Booking mode split | Pie chart: in-person vs remote |
| Fill rate | Percentage of bookings that reach `confirmed` status (vs expired/cancelled) |
| User growth | Cumulative signups over time, split by role |
| Reports per week | Line chart, last 12 weeks |

### No Individual Data

The dashboard never shows:

- Individual user names or emails
- Specific booking details
- Location data below state level
- Any data that could identify a specific person

## Admin Notifications

Admins receive notifications (email) for:

- New report submitted
- Daily summary: open reports count, new signups, booking volume

## Technical Implementation

The admin panel is a set of protected routes within the same Next.js application. No separate deployment.

```
/admin
/admin/users
/admin/users/[id]
/admin/reports
/admin/reports/[id]
/admin/bookings
/admin/bookings/[id]
/admin/analytics
```

All admin queries use the Supabase service role key (server-side only) to bypass RLS where necessary. Admin actions are logged to an `admin_audit_log` table:

```sql
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

This provides an audit trail for all moderation actions.
