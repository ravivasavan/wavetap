# WaveTap — Auth, Security & Privacy

## Authentication

### Magic Link (Launch)

WaveTap uses passwordless authentication via magic link. Users enter their email address and receive a one-time login link. No passwords to remember, no password reset flows, no credential stuffing risk.

**Flow:**
1. User enters email on login/signup screen
2. Supabase Auth sends a magic link to that email
3. User clicks the link → authenticated and redirected to the app
4. Session is persisted per platform (see below)

**Per-platform session handling:**
- **Web:** secure HTTP-only cookie; the magic link returns to `/auth/callback`.
- **Native (Expo):** the magic link opens via an app/universal link (`wavetap.app` deep link) back into the app; the Supabase session is stored in the OS secure store (`expo-secure-store`), not `localStorage`.

**Session duration:** 7 days with refresh token rotation, on both clients.

### OAuth (Future)

Google and Apple OAuth will be added as secondary auth options. Supabase Auth supports these out of the box — configuration only, no code changes to the auth flow.

### Banned Email Enforcement

On every login/signup attempt, the email is checked against the `banned_emails` table. If matched, authentication is rejected with a generic "unable to create account" message. No indication is given that the email is specifically banned.

## Privacy

### Location Privacy

- Users enter a suburb or postcode which is geocoded to lat/lng
- Lat/lng is stored in the database for geospatial queries
- **The exact location is never exposed to other users**
- The frontend renders a fuzzy circle (pin + 5km radius) on any map display
- Exact addresses are never entered on-platform — specific location details are exchanged off-platform after the match

### Contact Detail Privacy

- Email and mobile are stored in profiles
- These are **only shared with the other party after booking confirmation**
- Before confirmation, users see only: display name, avatar, general area, bio, sign languages
- The user chooses which contact detail(s) to share via `preferred_contact` setting

### Minimal Data Collection

The platform collects only what is necessary to facilitate the match:

- Name, email, mobile (optional), location, sign languages, availability, role
- Booking details (title, date, time, mode, fuzzy location)
- No browsing history, no usage analytics tied to individuals, no tracking pixels

### Data Retention

- Active accounts: data persists while the account exists
- Expired/cancelled bookings: retained in user history for reference
- Deleted accounts: **all data is permanently removed** (hard delete, cascading)
- Reports involving deleted users: the report record remains for admin reference but all identifying user data is removed

## Account Deletion

Users can delete their account from settings at any time. This triggers:

1. Supabase Auth user record deleted
2. Profile and interpreter profile deleted (cascade)
3. All bookings created by the user deleted (cascade to interests and confirmations)
4. All booking interests by the user deleted
5. All notifications deleted
6. Report records anonymised (user IDs nullified, reason/notes retained for admin audit)

This is irreversible. The user is prompted to confirm before proceeding.

## Terms of Service

On signup, users accept a Terms of Service that establishes:

- WaveTap is a neutral aggregator that connects Signers with Interpreters
- WaveTap does not employ, endorse, verify credentials, or guarantee either party
- All agreements, payments, invoicing, scheduling, and disputes are handled directly between the parties off-platform
- WaveTap holds no liability for the conduct, quality, reliability, or outcomes of any booking
- Users are responsible for their own conduct on the platform
- WaveTap reserves the right to suspend or ban accounts that violate community guidelines

## Security Measures

### Row Level Security

Every Supabase table is protected by RLS policies. No data is accessible without an authenticated session and appropriate role context.

### HTTPS Only

The `.app` TLD enforces HTTPS at the domain level. All traffic is encrypted in transit.

### Input Validation

- All user inputs are validated on both client and server
- SQL injection is mitigated by Supabase's parameterised queries
- XSS is mitigated by React's default escaping and Content Security Policy headers

### Rate Limiting

- Magic link requests: max 3 per email per 15 minutes (Supabase default)
- Booking creation: max 10 per user per hour
- Interest expression: max 20 per user per hour
- Report submission: max 5 per user per day

### Admin Access

Admin functions are protected by a role check in RLS policies. Admin status is stored as a flag on the profile and can only be set directly in the database (not via the UI). There is no self-service admin promotion.
