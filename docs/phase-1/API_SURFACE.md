# Phase 1 API Surface (Draft)

## Auth

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/otp/resend`

## Onboarding

- `GET /meta/schools`
- `GET /meta/neighbourhoods`
- `GET /meta/interests`
- `POST /onboarding/profile`
- `POST /onboarding/interests`
- `POST /onboarding/complete`

## Pulse

- `GET /pulse`
- `GET /pulse/pinned-event`

## Spaces and Forums

- `GET /spaces`
- `GET /spaces/:spaceId`
- `POST /spaces/:spaceId/join`
- `POST /spaces/:spaceId/leave`
- `GET /spaces/:spaceId/threads`
- `POST /spaces/:spaceId/threads`
- `GET /threads/:threadId`
- `POST /threads/:threadId/replies`
- `POST /posts/:postId/vote`
- `POST /posts/:postId/report`
- `POST /posts/:postId/moderation-action`

## Events

- `GET /events`
- `POST /events`
- `GET /events/:eventId`
- `POST /events/:eventId/register`
- `GET /events/:eventId/registrations/me`

## Profile and Social

- `GET /profiles/:userId`
- `PATCH /profiles/me`
- `POST /friends/requests`
- `POST /friends/requests/:requestId/accept`
- `POST /users/:userId/block`
- `POST /account/delete/request-otp`
- `POST /account/delete/confirm`

## Staff Dashboard

- `GET /staff/moderation/reports`
- `POST /staff/moderation/reports/:reportId/resolve`
- `GET /staff/events/review-queue`
- `POST /staff/events/:eventId/assign-tier`
- `GET /staff/users`
- `POST /staff/users/:userId/action`
- `GET /staff/audit-logs`

## Rules to Enforce in API Layer

- Pulse excludes community-tier events.
- Anonymous posting accepted only if:
  - space type is school/college
  - anonymous mode is enabled by coordinator/admin
- Interests selected at onboarding completion must be exactly 5.

