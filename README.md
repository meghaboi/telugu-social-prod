# telugu-social-prod

Execution workspace for Phase 1 delivery across:

- user app (iOS, Android, web)
- organizer workflows (Phase 2+)
- staff dashboard (web)

## Phase 1

Primary delivery document:

- [PHASE_1_ONE_SHOT.md](/c:/Users/Admin/telugu-social-prod/PHASE_1_ONE_SHOT.md)

Detailed execution docs:

- [Phase 1 Taskboard](/c:/Users/Admin/telugu-social-prod/docs/phase-1/TASKBOARD.md)
- [Phase 1 Tech Setup](/c:/Users/Admin/telugu-social-prod/docs/phase-1/TECH_SETUP.md)
- [Phase 1 API Surface](/c:/Users/Admin/telugu-social-prod/docs/phase-1/API_SURFACE.md)
- [Phase 1 Data and Seed Plan](/c:/Users/Admin/telugu-social-prod/docs/phase-1/DATA_AND_SEEDS.md)
- [Phase 1 Launch Gates](/c:/Users/Admin/telugu-social-prod/docs/phase-1/LAUNCH_GATES.md)
- [Phase 1 Implementation Status](/c:/Users/Admin/telugu-social-prod/docs/phase-1/IMPLEMENTATION_STATUS.md)

## Implemented in this repo

- `apps/api`: Express + Prisma API with Phase 1 domain endpoints.
- `apps/web`: Vite React user app shell with OTP + Pulse/events/spaces integration.
- `apps/staff-dashboard`: Vite React staff app shell for moderation/review/audit flows.
- `apps/mobile`: Expo app shell with OTP + Pulse integration baseline.

## Pending

- Full UX completion for all Phase 1 screens in mobile/web (current state is functional shell + core integrations).
- Production auth provider wiring for OTP (current state includes dev OTP for local/QA).
- Full app-store packaging/review assets and release orchestration.
- End-to-end automated tests for major user and staff journeys.
- GitHub repository publishing currently blocked until `gh` auth is refreshed on this machine.

## CI/CD

- CI workflow: [`.github/workflows/ci.yml`](/c:/Users/Admin/telugu-social-prod/.github/workflows/ci.yml)
- CD workflow: [`.github/workflows/cd-azure.yml`](/c:/Users/Admin/telugu-social-prod/.github/workflows/cd-azure.yml)
- Azure provisioning docs: [infra/azure/README.md](/c:/Users/Admin/telugu-social-prod/infra/azure/README.md)

## Quick Start

1. Install dependencies:
   - `npm install`
2. Generate Prisma client:
   - `npm run db:generate`
3. Initialize database:
   - `npm run db:init`
4. Seed sample data:
   - `npm run seed`
5. Start apps:
   - API: `npm run dev:api`
   - User web: `npm run dev:web`
   - Staff dashboard: `npm run dev:staff`
   - Mobile app: `npm run dev:mobile`

## Repo Layout

- `apps/mobile` - consumer mobile app (React Native/Expo target)
- `apps/web` - consumer web app
- `apps/staff-dashboard` - internal staff dashboard
- `apps/api` - backend API
- `packages/ui` - shared UI primitives/tokens
- `packages/types` - shared types/contracts
- `packages/config` - lint/ts/env shared configs
- `migrations` - database migrations
- `infra` - infra and deployment definitions
