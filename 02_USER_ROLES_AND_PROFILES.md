# WaveTap — User Roles & Profiles

## Two Roles, One Platform

WaveTap has two explicit user roles:

1. **Deaf/HoH** — The person who creates bookings and selects interpreters
2. **Interpreter** — The person who responds to bookings and makes themselves available

Both are signers. The platform differentiates by function: you are either **booking** or **available to be booked**.

## Dual-Role Accounts

A single account can hold both roles. For example, a Deaf interpreter can toggle between:

- Browsing and creating bookings (Deaf/HoH mode)
- Viewing and responding to booking requests (Interpreter mode)

The experience adapts based on the active role. Role selection happens at signup and can be changed or expanded in settings. The interface should make the active role clear at all times without being intrusive.

## Signup Flow

1. Magic link authentication (email-based, passwordless)
2. Choose role: **Deaf/HoH** or **Interpreter** (or both)
3. Minimal profile setup based on role
4. Accept Terms of Service (neutral aggregator disclaimer)
5. Done

OAuth (Google, Apple) is on the roadmap but not at launch.

## Profile Fields

### Deaf/HoH Profile

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
