# Telugu.social Phase 1 One-Shot Plan

## 1) Outcome for Phase 1

By the end of Phase 1, telugu.social has:

- Consumer app baseline shipped to internal alpha on iOS, Android, and web.
- Staff dashboard v1 on web for moderation and event curation.
- End-to-end core loops working in production-like staging:
  - OTP onboarding -> interest-based space join -> Pulse feed -> forum interaction -> event discovery -> free event registration.
- Operational readiness for scaling in Phase 2 (payments, chat, QR ops, organizer operations).

Target duration: **8 weeks**  
Suggested dates: **March 30, 2026 - May 29, 2026**

## 2) Phase 1 Scope Lock

### In scope

- Auth and onboarding
  - Phone number + OTP verification.
  - Name + unique username.
  - School/college selection from Hyderabad index or skip.
  - Neighbourhood selection.
  - Exactly 5 interests.
  - Auto-join corresponding Official Spaces.
- Pulse v1
  - Exactly 15 entries in 3 groups of 5:
    - Friend signups.
    - Interest-matched events.
    - Space-related/staff-promoted events.
  - Registered event pinned card visible until 48h after event end.
  - Only official + verified events shown on Pulse.
- Spaces and forums v1
  - Space types: Official, School/College, Community.
  - Roles: admin, moderator, member.
  - Thread list with sorting (latest activity, top, newest).
  - Thread detail with nested replies (unlimited depth), collapse branch, voting, reporting.
  - Admin/mod long-press actions: delete, lock, mute.
  - Anonymous posting allowed only in school spaces when enabled.
- Events core v1
  - Event creation for all users.
  - Tier model exists (official, verified, community).
  - Events browse with filters (category, area, date, price, tier).
  - Event detail (description, schedule, venue, who is going, updates feed placeholder).
  - Free registration flow baseline (review -> form -> confirm with static token/placeholder QR payload).
- Profile v1
  - Profile view/edit basics.
  - Privacy controls: connection visibility + non-friend visibility.
  - Friend request/accept connection.
  - Block users.
  - Delete account with OTP confirmation.
- Staff dashboard v1
  - User management.
  - Event review + tier assignment.
  - Moderation queue.
  - School index management.
  - Audit logs for sensitive actions.
- Platform
  - Role-based access controls.
  - Feature flags.
  - Observability: logs, metrics, errors, crash analytics.
  - CI/CD with staging + production environments.

### Explicitly out of scope for Phase 1

- Paid events and Razorpay.
- Organizer dashboard full operations.
- Event inbox broadcasts.
- DMs and group chat.
- QR scanner operations.
- Badge approvals, achievements pipeline, EXP automation.
- Payouts and finance workflows.

## 3) Architecture and Stack (Recommended)

Use one codebase strategy optimized for mobile + web delivery speed.

- Monorepo with Turborepo or Nx.
- Apps:
  - `apps/mobile` (React Native + Expo).
  - `apps/web` (Next.js user web app).
  - `apps/staff-dashboard` (Next.js internal dashboard).
- Backend:
  - `apps/api` (NestJS or Fastify-based TypeScript API).
  - PostgreSQL as primary DB.
  - Redis for caching, counters, OTP/session/queue support.
  - S3-compatible object storage for media.
- Shared packages:
  - `packages/ui` shared design tokens/components.
  - `packages/types` shared contracts (DTOs/schemas).
  - `packages/config` lint, tsconfig, env validation.
- Infra:
  - Managed Postgres + Redis.
  - Containerized API.
  - CDN for media and static assets.
  - Separate envs: local, staging, production.

## 4) Core Data Model (Phase 1)

Minimum entities to build first:

- `users`, `user_profiles`, `otp_sessions`
- `schools`, `neighbourhoods`, `interests`
- `spaces`, `space_memberships`, `space_roles`
- `threads`, `posts`, `post_votes`, `post_reports`
- `events`, `event_updates`, `event_registrations`
- `friend_requests`, `friend_connections`, `blocks`
- `staff_actions_audit_log`
- `pulse_materialized_items` (or feed computation cache table)

Non-negotiable constraints:

- Username unique globally.
- Interests selected count must equal 5 at onboarding completion.
- School field is self-reported metadata only.
- Community events never included in Pulse selection query.

## 5) Team Structure and Ownership

Run 3 pods from week 1:

1. Consumer Experience Pod
   - Owns onboarding, Pulse, profile, social graph.
2. Community Pod
   - Owns spaces, forums, moderation surface in app.
3. Platform + Trust Pod
   - Owns API foundations, staff dashboard, audit, CI/CD, observability.

Staffing minimum for one-shot execution:

- 1 Engineering lead.
- 3 frontend engineers (RN/web).
- 3 backend engineers.
- 1 QA automation + 1 manual QA.
- 1 product designer.
- 1 product manager.
- 1 DevOps/SRE (shared acceptable).

## 6) 8-Week Sprint Plan

### Sprint 1 (Weeks 1-2): Platform baseline + onboarding

- Monorepo bootstrapped.
- Auth service with OTP flow.
- Onboarding API + UI flows.
- School/neighbourhood/interest seed data import.
- Auto-join Official Spaces.
- CI running lint/typecheck/tests/build.

Exit gate:

- New user can complete onboarding and land on empty Pulse.

### Sprint 2 (Weeks 3-4): Spaces + forums core

- Space listing and membership.
- Thread creation/list/detail.
- Nested replies and collapse state.
- Voting and score computation.
- Report actions + mod/admin controls.

Exit gate:

- Users actively discuss in spaces; moderation actions enforceable.

### Sprint 3 (Weeks 5-6): Events + Pulse v1 + profile

- Event CRUD baseline with tier tagging.
- Browse and filtering.
- Event registration (free path).
- Pulse ranking + grouping logic with 15-card layout.
- Registered-event pinned card TTL behavior.
- Profile editing/privacy/friends/block/account deletion.

Exit gate:

- Core discovery-to-registration loop is functional end-to-end.

### Sprint 4 (Weeks 7-8): Staff dashboard + hardening + alpha release

- Staff event review and tier assignment.
- Moderation queue and user actions.
- Audit log views for sensitive operations.
- Observability dashboards and alerting.
- Performance and regression passes.
- Closed alpha deployment for iOS/Android/web.

Exit gate:

- Internal alpha approved with critical severity bug count at zero.

## 7) Release Tracks and Environments

### Environments

- `local`: engineer/dev only.
- `staging`: integration and QA, production-like.
- `prod`: live environment with feature flags.

### Distribution

- iOS: TestFlight internal group.
- Android: Play internal testing track.
- User web app: production URL behind invite gate if needed.
- Staff dashboard: restricted domain with SSO and role gates.

## 8) Quality Gates (Must Pass Before Phase 1 Sign-off)

- Security
  - OTP abuse protection and rate limiting.
  - Role-based authorization tested for all admin/mod/staff actions.
  - Audit logs generated for sensitive staff operations.
- Reliability
  - P95 API latency target for key endpoints under test load.
  - No Sev-1/Sev-2 open incidents.
- Product correctness
  - Pulse card composition follows exact 5/5/5 rules.
  - Community events excluded from Pulse by policy and tests.
  - Anonymous posting restricted to enabled school spaces only.
- QA
  - End-to-end happy paths automated for onboarding, thread flow, event registration, moderation.
  - Manual exploratory passes on major devices.

## 9) Backlog Template (Ready to Import)

Use these epics directly in Jira/Linear:

- EPIC-P1-001 Auth + OTP + onboarding.
- EPIC-P1-002 Interest graph + Official Spaces auto-membership.
- EPIC-P1-003 Pulse feed generation and ranking.
- EPIC-P1-004 Spaces + role model + permissions.
- EPIC-P1-005 Forums (threads, nested replies, voting, reports).
- EPIC-P1-006 Events core + browse + free registration.
- EPIC-P1-007 Profiles + privacy + social graph.
- EPIC-P1-008 Staff dashboard v1 + moderation + event review.
- EPIC-P1-009 Observability, audit, infra, CI/CD.
- EPIC-P1-010 Alpha release management.

## 10) Immediate Setup Checklist (This Week)

1. Create monorepo skeleton and app/package layout.
2. Provision Postgres, Redis, object storage (staging + prod).
3. Configure CI pipelines for lint/typecheck/test/build.
4. Implement env management and secrets strategy.
5. Seed initial Hyderabad school + neighbourhood + interests datasets.
6. Implement auth + onboarding first vertical slice.
7. Stand up feature flag service and error monitoring.
8. Define API contract conventions and migration policy.
9. Set up analytics events for onboarding and Pulse interactions.
10. Start TestFlight and Play Console app records now (avoid end-cycle blocking).

## 11) Risks and Mitigation

- Risk: Scope creep from Phase 2 features entering Phase 1.
  - Mitigation: strict scope lock and change control approval.
- Risk: App store policy issues around UGC/moderation.
  - Mitigation: shipping report/block/mute/admin tooling in Phase 1.
- Risk: Dataset quality for schools/neighbourhoods.
  - Mitigation: import pipeline + admin corrections in staff dashboard.
- Risk: Feed quality dissatisfaction at alpha.
  - Mitigation: instrument Pulse sources and expose tuning params via config.

## 12) Definition of Done (Phase 1 Complete)

Phase 1 is done only when all are true:

- iOS alpha, Android alpha, and web user app are live and usable.
- Staff dashboard can moderate content and assign event tiering.
- Core social + event loops pass QA and product acceptance.
- Observability and on-call alerting are operational.
- No blocker defects for onboarding, Pulse, spaces/forums, and free event registration.

