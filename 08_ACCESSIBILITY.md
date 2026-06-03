# WaveTap — Accessibility

## Baseline

WCAG 2.1 AA compliance is the minimum. WaveTap goes beyond this with Deaf-specific UX principles because the primary user base is Deaf and Hard of Hearing.

## Deaf-Specific UX Principles

### 1. No Audio-Only Information

Nothing on the platform relies on sound. No audio alerts, no audio-only content, no spoken instructions. Every piece of information is delivered visually.

- Notifications are visual (on-screen banners, badges, vibration on mobile)
- No audio cues for success/error states
- No video content with spoken narration unless captioned
- No CAPTCHA with audio-only alternatives

### 2. Visual Feedback for All Interactions

Every user action must produce clear, immediate visual confirmation:

- Button presses show visible state change (loading → success/error)
- Form submissions display clear success or error messaging
- Booking status changes are reflected with visible indicators (colour, icon, text)
- Navigation changes are visually obvious (active states, breadcrumbs, transitions)

### 3. High Visual Contrast

- Minimum contrast ratio of 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- Aim for 7:1 where possible (WCAG AAA)
- Status indicators use both colour AND icon/text — never colour alone
- Focus indicators are bold and visible (minimum 2px outline, high contrast)

### 4. Clear, Simple Language

- Interface copy is plain and direct
- Avoid idioms, jargon, or unnecessarily complex language
- English may be a second language for many Deaf users — write for clarity
- Error messages explain what happened and what to do next in simple terms
- Avoid walls of text — use short sentences and clear visual hierarchy

### 5. Spacious, Uncluttered Layout

- Generous whitespace between interactive elements
- Touch targets minimum 44x44px (WCAG) — aim for 48x48px
- One primary action per screen where possible
- Step-by-step flows rather than dense forms
- No information overload — progressive disclosure

### 6. Visual Hierarchy Over Text Hierarchy

- Use size, weight, colour, and spacing to create hierarchy — don't rely on heading levels alone
- Icons alongside text labels for key actions
- Visual status indicators (colour-coded pills, progress indicators) to reduce reading load

### 7. Motion and Animation

- Animations are subtle and purposeful — they indicate state change, not decoration
- All animations respect reduced-motion preferences (`prefers-reduced-motion` on web; the OS reduce-motion setting via `AccessibilityInfo.isReduceMotionEnabled()` on native)
- No flashing content (WCAG seizure guidelines)
- Loading states use visual spinners or skeleton screens, not timed messages

## Keyboard and Screen Reader Support

While the primary user base is Deaf (not blind), WaveTap still supports assistive tech on every platform:

**Web**
- Full keyboard navigation (tab order, focus management, skip links)
- Semantic HTML throughout (proper heading structure, landmarks, ARIA where needed)
- Screen reader compatible (labels, descriptions, live regions for dynamic content)
- Focus trapping in modals and dialogs

**Native (iOS / Android)**
- Every interactive element sets `accessibilityLabel`, `accessibilityRole`, and `accessibilityHint` where helpful
- Logical focus order; dynamic changes announced via `accessibilityLiveRegion` (Android) / accessibility announcements (iOS)
- Respects OS font scaling (Dynamic Type / font size settings) — layouts must not break when text scales
- HeroUI (`heroui-native`) components ship sensible accessibility defaults; we verify rather than assume

This ensures the platform is usable by Deaf-blind users with VoiceOver (iOS/macOS), TalkBack (Android), and NVDA (Windows), and meets WCAG compliance.

## Form Design

Forms are the core interaction (creating bookings, setting up profiles). They must be effortless:

- One question per step where possible (stepped/wizard pattern)
- Labels are always visible (no placeholder-only labels)
- Error messages appear inline next to the relevant field
- Required fields are clearly marked
- Auto-save or explicit save confirmation — never lose user input
- Date/time pickers are visual (calendar, clock) rather than text input
- Dropdowns, pickers, and overlays use accessible HeroUI components (`@heroui-pro/react` on web, `heroui-native` on native) — which ship correct roles, focus management, and labelling out of the box

## Notification Accessibility

- Push notifications display as visual banners
- In-app notifications use a visible badge/counter
- Notification preference is user-controlled (email, push, SMS — any combination)
- No notification relies on a single channel — critical notifications (booking confirmed) are sent via all enabled channels

## Responsive Web + Native Mobile

**Web**
- All layouts are fully responsive from 320px to 1440px+
- Touch-first interaction design; works equally with mouse/keyboard
- Mobile viewport avoids zoom-blocking (`user-scalable=yes`)
- Horizontal scrolling is avoided entirely

**Native**
- Layouts adapt across phone sizes and orientations; safe-area insets respected (notches, home indicator)
- Touch targets meet the same ≥ 48×48px floor
- Honours OS-level text scaling and reduce-motion / reduce-transparency settings
- No content relies on hover; all affordances are tap-reachable

## Testing

- Automated (web): axe-core or Lighthouse accessibility audits in CI
- Automated (native): Xcode Accessibility Inspector + Android Accessibility Scanner spot-checks
- Manual: keyboard-only navigation (web) and switch/keyboard testing (native) for all flows
- Screen reader testing: VoiceOver (macOS/iOS), TalkBack (Android), NVDA (Windows)
- Colour contrast: verified with tools like Stark or Contrast Checker — tokens are shared, so a pass on one platform carries to the other
- Community testing: invite Deaf users to test on web and on-device during development

## Accessibility Checklist (Per Feature)

Before shipping any feature, verify:

- [ ] No audio-only information
- [ ] All interactive elements have visible focus styles
- [ ] Colour is not the sole indicator of state
- [ ] Touch targets ≥ 48x48px
- [ ] Text contrast ≥ 4.5:1
- [ ] Keyboard navigable
- [ ] Screen reader announces state changes
- [ ] Error messages are clear and actionable
- [ ] Animations respect reduced-motion (web + native)
- [ ] Works at 320px viewport width (web) and across phone sizes + safe areas (native)
- [ ] Respects OS text scaling without breaking layout (native)
