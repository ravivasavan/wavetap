# WaveTap — Design System

## Brand Identity

### Name
**WaveTap**

### Tagline
**Wave. Tap. Book.**

### Voice & Tone
- **Simple** — Plain language, short sentences, no jargon
- **Calm** — Quiet confidence, never loud or urgent
- **Neutral** — The platform doesn't take sides. It connects.
- **Technical without being inaccessible** — Clear about what the platform does and doesn't do
- **Respectful** — The user is the expert on their own needs

### Brand Position
WaveTap is a connector, not a service provider. It facilitates a moment between two people and then steps aside. The brand should feel like a trusted, quiet tool — not a personality.

## Visual Direction

Inspired by Airbnb: modern, spacious, floating, uncluttered, step-by-step. The interface breathes. Every screen has a clear purpose and a single primary action.

### Design Principles

1. **Space is a feature** — Generous padding, margins, and whitespace. Never cramped.
2. **One thing at a time** — Step-by-step flows. Progressive disclosure. No information overload.
3. **Warm, not clinical** — Rounded corners, soft shadows, warm tones. This is a community tool, not enterprise software.
4. **Floating elements** — Cards, modals, and panels feel elevated with subtle shadows. Layered depth, not flat.
5. **Visual over textual** — Use icons, illustrations, and visual indicators to reduce reading load.

## Colour Palette

### Neutrals (Warm)

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#FAFAF8` | Page background |
| `neutral-100` | `#F5F4F0` | Card background, secondary surfaces |
| `neutral-200` | `#E8E6E0` | Borders, dividers |
| `neutral-300` | `#D1CEC5` | Disabled states, placeholder text |
| `neutral-400` | `#A8A49A` | Secondary text |
| `neutral-500` | `#7A756B` | Body text (secondary) |
| `neutral-600` | `#5C5850` | Body text (primary) |
| `neutral-700` | `#3D3A34` | Headings |
| `neutral-800` | `#2A2824` | High emphasis text |
| `neutral-900` | `#1A1916` | Maximum contrast |

### Hero Accent (Warm Coral)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#FFF5F2` | Accent background (light) |
| `accent-100` | `#FFE8E0` | Hover states, highlights |
| `accent-200` | `#FFD0C0` | Active states |
| `accent-300` | `#FFB09A` | Badges, indicators |
| `accent-400` | `#FF8B6A` | Secondary buttons |
| `accent-500` | `#E8694A` | **Primary accent** — CTAs, links, active states |
| `accent-600` | `#C9523A` | Hover on primary accent |
| `accent-700` | `#A13D2C` | Pressed states |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#4A9A6B` | Confirmed, success states |
| `warning` | `#D4953A` | Pending, attention needed |
| `error` | `#C94A4A` | Error, destructive actions |
| `info` | `#4A7AC9` | Informational |

### Usage Rules

- **One accent colour.** The warm coral is the only colour that draws attention. Everything else is neutral.
- **Colour is never the sole indicator.** Always paired with icon, text, or shape.
- **Background is warm, not white.** Use `neutral-50` as the base, not pure `#FFFFFF`.

## Typography

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `heading-xl` | Inter | 32px / 2rem | 600 | Page titles |
| `heading-lg` | Inter | 24px / 1.5rem | 600 | Section headings |
| `heading-md` | Inter | 20px / 1.25rem | 600 | Card titles |
| `body-lg` | Inter | 18px / 1.125rem | 400 | Lead text, important body |
| `body` | Inter | 16px / 1rem | 400 | Default body text |
| `body-sm` | Inter | 14px / 0.875rem | 400 | Secondary text, captions |
| `label` | Inter | 14px / 0.875rem | 500 | Form labels, tags |
| `button` | Inter | 16px / 1rem | 500 | Button text |

**Line height:** 1.5 for body text, 1.3 for headings.

**Font:** Inter (variable weight, Google Fonts, free). Clean, highly legible, excellent at small sizes.

## Spacing Scale

Based on a 4px grid:

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-20` | 80px |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Inputs, small elements |
| `radius-md` | 12px | Cards, buttons |
| `radius-lg` | 16px | Modals, large panels |
| `radius-full` | 9999px | Avatars, pills, badges |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(26, 25, 22, 0.06)` | Subtle lift |
| `shadow-md` | `0 4px 12px rgba(26, 25, 22, 0.08)` | Cards, floating elements |
| `shadow-lg` | `0 8px 24px rgba(26, 25, 22, 0.12)` | Modals, elevated panels |
| `shadow-xl` | `0 16px 48px rgba(26, 25, 22, 0.16)` | Dialogs, popovers |

## Components

### Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `accent-500` | `white` | none | Main CTA — one per screen |
| Secondary | `neutral-100` | `neutral-700` | `neutral-200` | Secondary actions |
| Ghost | transparent | `neutral-600` | none | Tertiary, cancel, back |
| Destructive | `error` | `white` | none | Delete, ban (admin only) |

All buttons: `radius-md`, `padding: space-3 space-6`, minimum width 120px, minimum height 48px (touch target).

### Cards

- Background: `neutral-100` or `white`
- Border: `1px solid neutral-200`
- Shadow: `shadow-md`
- Radius: `radius-lg`
- Padding: `space-6`
- Hover state: `shadow-lg` transition

### Inputs

- Background: `white`
- Border: `1px solid neutral-200`
- Radius: `radius-sm`
- Padding: `space-3 space-4`
- Height: 48px minimum
- Focus: `2px solid accent-500` outline
- Error: `2px solid error` outline + inline error message
- Labels always visible above the input

### Status Pills

| Status | Background | Text |
|--------|-----------|------|
| Open | `accent-50` | `accent-600` |
| Pending | `warning` (10% opacity) | `warning` |
| Confirmed | `success` (10% opacity) | `success` |
| Expired | `neutral-200` | `neutral-500` |
| Cancelled | `neutral-200` | `neutral-500` |

## Layout

### Container

- Max width: 1200px
- Horizontal padding: `space-6` (mobile), `space-10` (desktop)
- Centred

### Grid

- 12-column grid on desktop
- Single column on mobile
- Gutter: `space-6`

### Navigation

- Top navigation bar, fixed
- Logo (left), primary nav (centre), avatar/menu (right)
- Mobile: bottom tab bar for primary actions (Home, My Bookings, Profile)
- Active role indicator visible in nav (subtle badge showing "Deaf/HoH" or "Interpreter")

## Iconography

Use **Lucide Icons** (open source, consistent, clean). 24px default size, 1.5px stroke weight.

Key icons:
- Wave: `hand` or custom wave illustration
- Booking: `calendar`
- Location: `map-pin`
- Remote: `video`
- In-person: `map-pin`
- Profile: `user`
- Settings: `settings`
- Notifications: `bell`
- Flag/Report: `flag`
- Check/Confirm: `check-circle`

## Illustrations

Minimal, warm, human. Line-art style with accent colour highlights. Used sparingly:
- Empty states ("No bookings yet — create your first one")
- Onboarding steps
- Success/confirmation moments

No stock photography. No AI-generated imagery. If photography is used, it should be authentic and sourced from/approved by the Deaf community.
