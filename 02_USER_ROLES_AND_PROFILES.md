# WaveTap — User Roles & Profiles

## Two Roles, One Platform

WaveTap has two explicit user roles:

1. **Signer** — The person who creates bookings and selects interpreters
2. **Interpreter** — The person who responds to bookings and makes themselves available

Both are signers. The platform differentiates by function: you are either **booking** or **available to be booked**.

## Dual-Role Accounts

A single account can hold both roles. For example, a Deaf interpreter can toggle between:

- Browsing and creating bookings (Signer mode)
- Viewing and responding to booking requests (Interpreter mode)

The experience adapts based on the active role. At signup the user picks a **starting mode** (Signer, Interpreter, or both) — framed as a starting point, not a permanent choice. The **second role is an additive opt-in** added anytime from Profile ("Offer to interpret" / "Need an interpreter yourself?"), never a re-onboard. The interface should make the active role clear at all times without being intrusive. See the [[2026-06-03-onboarding-soft-starting-mode]] decision.

## Signup Flow

1. Email authentication (passwordless) — **magic link and a 6-digit code, co-equal** — see `06_AUTH_SECURITY_PRIVACY.md`
2. Pick a **starting mode**: *I need an interpreter* (Signer) / *I'm an interpreter* (Interpreter) / *Both* — reversible, not a hard fork
3. Minimal setup for the chosen mode (Signer: name, location, contact preference — then they can post a booking immediately). The Interpreter path is a non-blocking checklist (see below)
4. Accept Terms of Service (neutral aggregator disclaimer)
5. Done

OAuth (Google, Apple) is on the roadmap but not at launch.

### Interpreter "live" state

An interpreter is **not visible in the booking pool until their setup checklist clears** — at minimum a **working area + radius** and an **availability pattern** must be set (bio, photo, and the Deaf-interpreter toggle are optional). Until then the account exists and can browse, but isn't eligible to receive or appear against bookings. This prevents half-configured interpreters surfacing to signers. See `11_ROUTES_AND_PAGES.md` (`/onboarding/interpreter`).

## Profile Fields

### Signer Profile

| Field | Required | Notes |
|-------|----------|-------|
| Display name | Yes | Can be first name only |
| Email | Yes | Used for auth and contact sharing |
| Mobile | Optional | Shared with interpreter on confirmed booking if populated |
| Location (suburb/postcode) | Yes | Used for fuzzy matching, never shown exactly |
| Sign language(s) | Yes | Auslan at launch, multi-language infrastructure |
| Preferred contact method | Yes | Email or Mobile — determines what is shared on match |
| Profile photo | Optional | |

### Interpreter Profile

| Field | Required | Notes |
|-------|----------|-------|
| Display name | Yes | Can be first name only |
| Email | Yes | Used for auth and contact sharing |
| Mobile | Optional | Shared with signer on confirmed booking if populated |
| Location (suburb/postcode) | Yes | Used as centre point for working radius |
| Working radius (km) | Yes | Only see in-person bookings within this radius |
| Sign language(s) | Yes | Auslan at launch, multi-language infrastructure |
| Availability pattern | Yes | General weekly windows (e.g. "Weekdays, daytime") |
| Preferred contact method | Yes | Email or Mobile — determines what is shared on match |
| Brief bio | Optional | Short free-text, no structure enforced |
| Deaf interpreter | Optional | Self-declared boolean. If true, renders a *"Deaf interpreter"* chip on the candidate card during signer selection. Not verified, not a credential. See `is_deaf_interpreter` in 05_DATA_MODEL.md. |
| Profile photo | Optional | |

### What Is NOT on Profiles

- No credentials, certifications, or qualifications fields
- No ratings or review scores
- No hourly rates
- No verified badges
- No social media links
- No organisation or agency affiliations

The platform is trust-based. Profiles are intentionally minimal to maintain neutrality and let the P2P relationship form naturally.

## Contact Sharing

Contact details (email and/or mobile, based on user preference) are only revealed to the other party **after a booking is confirmed**. Before confirmation, users see display name, general location area, bio (if set), and availability.

## Account Deletion

Users can delete their account at any time from settings. This permanently removes:

- All profile data
- All booking history
- All associated records

No data lingers after deletion. This is a hard delete, not a soft archive.
