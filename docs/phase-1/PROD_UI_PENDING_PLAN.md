# Production UI Pending Plan

Last updated: March 25, 2026

## Status Snapshot

- Phase 1 (routing/auth-state shell refactor): In progress
- Phase 2 (login + OTP + onboarding end-to-end): Completed in this branch
- Phase 3 (app shell with Pulse/Events/Spaces): Pending
- Phase 4 (staff dashboard shell + moderation/event queues): Pending
- Phase 5 (polish, accessibility, visual QA): Pending

## Phase 2 Delivery (Implemented)

Web app (`apps/web`) now includes:

1. Route-based auth entry points:
   - `/`
   - `/login`
   - `/otp`
2. Onboarding routes:
   - `/onboarding/profile`
   - `/onboarding/interests`
   - `/onboarding/location`
   - `/onboarding/terms`
3. Session-gated app routes:
   - `/app/pulse`
   - `/app/events`
   - `/app/spaces`
   - `/app/chat`
   - `/app/profile`
4. Real auth behavior:
   - phone validation
   - OTP request + verify + resend
   - resend cooldown timer + inline errors
5. Onboarding behavior:
   - profile save (`/onboarding/profile`)
   - interest selection/save (`/onboarding/interests`, exactly 5 per current backend rule)
   - location confirmation
   - terms acceptance + completion (`/onboarding/complete`)
6. Session behavior:
   - localStorage persistence
   - guarded redirects for public/onboarding/app sections
   - logout clears persisted state
   - session-expiry recovery path (redirect to login on auth-header failure)

Backend support update:

- `POST /auth/otp/verify` now returns `onboardingCompleted` for deterministic routing of existing users to `/app/pulse`.

This plan replaces the current styled dev shell approach with production-grade UX flows for both the user app (`apps/web`) and staff dashboard (`apps/staff-dashboard`).

## 1) App Information Architecture (Web)

1. Public routes: `/`, `/login`, `/otp`
2. Onboarding routes:
   - `/onboarding/profile`
   - `/onboarding/interests`
   - `/onboarding/location`
   - `/onboarding/terms`
3. App routes:
   - `/app/pulse`
   - `/app/events`
   - `/app/spaces`
   - `/app/chat`
   - `/app/profile`
4. Protected route guard with redirect/session handling

## 2) Real Signup/Login Flow

1. Phone input with validation
2. OTP screen with resend timer and error handling
3. New user onboarding with progress indicator
4. Existing users routed directly to `/app/pulse`
5. Session persistence, logout, and session-expiry recovery

## 3) Main App UX (Production-ready)

1. Pulse:
   - Sectioned feed cards
   - Filters
   - Pagination/load-more
   - Empty state
2. Events:
   - List + filter chips
   - Event detail
   - Apply CTA flow
3. Spaces:
   - Discovery list
   - Space detail
   - Threads list + composer
4. Chat:
   - Conversation list + message pane split layout
5. Profile:
   - Identity block
   - Interest chips
   - Stats
   - Activity list

## 4) Staff Dashboard UX (Production-ready)

1. Staff login gate + role-aware navigation
2. Overview:
   - KPI cards
   - Recent alerts
3. Moderation queue:
   - Filterable table
   - Status/reason/actions
   - Pagination
4. Event review queue:
   - Approve/reject workflow
   - Detail drawer
5. Users:
   - Searchable user list
   - Action confirmations
6. Audit logs:
   - Filterable log table
   - Metadata (timestamp/user/action)

## 5) Design System Implementation

1. Centralize tokens/components in `packages/ui`
2. Apply consistent typography, spacing, borders/elevation, and focus styles
3. Build reusable primitives:
   - `AppShell`
   - `PageHeader`
   - `Card`
   - `Table`
   - `FormField`
   - `EmptyState`
   - `StatusBadge`
   - `Modal`
   - `Toast`
4. Enforce consistent interactions and keyboard behavior

## 6) Quality Bar (Must-pass)

1. Loading/empty/error/success states on every screen
2. Inline form validation and actionable error copy
3. Responsive behavior across mobile/tablet/desktop
4. Accessibility pass: contrast, focus ring, labels, touch targets
5. Clean typecheck/build before merge

## 7) Execution Order

1. Refactor routing/auth state and remove shell screens
2. Implement login + OTP + onboarding end-to-end
3. Implement app shell with Pulse/Events/Spaces
4. Implement dashboard shell with Moderation/Event Queue/Users/Audit
5. Polish states + accessibility + visual QA pass

## 8) Blocker

Need final, exact design token color values from the design doc (`--c-ink` through `--c-rule`) to complete strict visual parity.
