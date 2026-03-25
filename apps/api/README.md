# API Service (Phase 1)

## Stack

- Node.js + Express + TypeScript
- Prisma ORM
- SQLite for local dev (`apps/api/dev.db`)

## Run

1. `npm run db:generate --workspace apps/api`
2. `npm run db:init --workspace apps/api`
3. `npm run seed --workspace apps/api`
4. `npm run dev --workspace apps/api`

## Auth Headers

- User routes require: `x-user-id: <userId>`
- Staff routes require:
  - `x-user-id: <staffUserId>`
  - `x-staff-role: staff_admin` (or other configured role string)

## Key Rules Implemented

- Pulse excludes community-tier events.
- Onboarding completion enforces exactly 5 interests.
- Official Space auto-join is triggered from onboarding complete.
- Anonymous posts are only allowed in school spaces with `allowAnonymous=true`.
