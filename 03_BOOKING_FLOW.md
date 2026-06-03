# WaveTap — Booking Flow

## Overview

The booking flow follows an Uber-like demand model adapted for planned bookings (days/weeks ahead, not on-demand). The signer posts a request, interpreters express interest, and the signer selects.

**Wave. Tap. Book.**

1. **Wave** — Signer creates a booking request, visible to the interpreter pool
2. **Tap** — Interpreters mark themselves as available for that booking
3. **Book** — Signer reviews interested interpreters and confirms one or more

## Step-by-Step Flow

### 1. Signer Creates a Booking Request

The signer fills out a simple form:

| Field | Required | Notes |
|-------|----------|-------|
| Title / brief description | Yes | Free text. Context is on the signer — they provide as much or as little as they want |
| Date | Yes | Single date picker |
| Start time | Yes | Time picker |
| End time / estimated duration | Optional | If not provided, left open |
| Mode | Yes | **In-person** or **Remote** |
| Location | Conditional | Required for in-person. Suburb/postcode level — displayed as pin + 5km fuzzy radius |
| Team composition | Optional | Two steppers — *Any interpreter: N* / *Deaf interpreter: M* — defining the booking's team size (1–10 total) and minimum DI requirement. Default: 1 Any, 0 Deaf. Persists as `slots` jsonb array in 05_DATA_MODEL.md. Confirmation is server-validated against the composition (signer can't accidentally confirm 2 DIs when 1 of each was needed). See 2026-05-22 mixed-type team bookings ADR. |
| Additional notes | Optional | Free text |

No booking categories (medical, legal, social, etc.). No specialisation filters. The signer describes what they need in plain language and the interpreter decides if it's a fit.

### 2. Booking Enters the Pool

Once submitted, the booking is visible to interpreters based on:

- **In-person bookings:** Shown to interpreters whose working radius overlaps with the booking's fuzzy location
- **Remote bookings:** Shown to all interpreters (location-agnostic)
- **Availability overlap:** Interpreters whose general availability pattern aligns with the booking's date/time are prioritised, but all eligible interpreters can see it

### 3. Interpreters Express Interest

Interpreters browsing the pool can mark themselves as **Available** for any booking. This is a one-tap action — no message, no bid, no negotiation on-platform.

The signer is notified (via their preferred notification channels) each time an interpreter expresses interest.

### 4. Signer Reviews and Selects

The signer sees a list of interested interpreters showing:

- Display name
- Profile photo (if set)
- Brief bio (if set)
- General location area
- Sign language(s)

The signer selects **one or more** interpreters and confirms the booking.

### 5. Handshake — Contact Details Exchanged

On confirmation:

- The signer's preferred contact detail (email and/or mobile) is shared with the selected interpreter(s)
- The interpreter's preferred contact detail (email and/or mobile) is shared with the signer
- Both parties receive a confirmation notification with the other's contact information

**The platform's job is done.** All further coordination — exact location, preparation materials, invoicing, payment, cancellation — happens off-platform between the two parties.

### 6. Booking Closes

Once the signer has selected their interpreter(s):

- The booking is removed from the pool
- Other interpreters who expressed interest are notified that the booking has been filled
- The booking remains in both parties' history (until account deletion)

## Booking States

| State | Description |
|-------|-------------|
| `open` | Booking is live in the pool, accepting interpreter interest |
| `pending` | At least one interpreter has expressed interest, signer has not yet confirmed |
| `confirmed` | Signer has selected interpreter(s), contact details exchanged |
| `expired` | Booking date has passed without confirmation |
| `cancelled` | Signer withdrew the booking before confirmation |

## Notifications

Notifications are sent at these moments:

| Event | Who is notified | Channels |
|-------|----------------|----------|
| New booking in area/pool | Eligible interpreters | User preference (push/email/SMS) |
| Interpreter expresses interest | Signer | User preference |
| Signer confirms and selects | Selected interpreter(s) | User preference |
| Booking filled | Non-selected interpreters who expressed interest | User preference |
| Booking cancelled by signer | Interpreters who expressed interest | User preference |
| Booking expired | Signer | User preference |

## What the Platform Does NOT Handle

- Cancellations after confirmation (handled off-platform)
- Payment or invoicing
- Exact location sharing
- Pre-booking communication between parties
- Rebooking or rescheduling
- Dispute resolution between parties

## Multi-Interpreter Bookings

A signer can select multiple interpreters for a single booking. This is common for longer events requiring interpreter rotation. The platform does not suggest or enforce this — the signer knows their needs. Each selected interpreter receives the signer's contact details independently.
