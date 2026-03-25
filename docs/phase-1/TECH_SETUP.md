# Phase 1 Technical Setup

## Monorepo

- Package manager: `pnpm`
- Workspace layout:
  - `apps/*`
  - `packages/*`
- Recommended orchestration: Turborepo

## Environments

- `local` for development
- `staging` for QA and integration
- `production` for live traffic

Required env categories:

- auth and OTP provider credentials
- database and redis URLs
- object storage keys/buckets
- analytics and error monitoring keys
- feature flags service keys

## CI/CD

Pipeline stages:

1. lint
2. typecheck
3. unit tests
4. build
5. deploy-to-staging (protected branch)
6. deploy-to-prod (tag/release gated)

## Baseline Services

- PostgreSQL
- Redis
- Object storage (S3-compatible)
- Centralized logs + metrics
- Crash and error monitoring

## Security Baseline

- Endpoint-level RBAC checks
- OTP rate limit and anti-abuse controls
- Audit logs for all staff-sensitive operations
- Account deletion with OTP re-auth confirmation

## App Distribution Setup (Start in Week 1)

- Apple App Store Connect app record
- TestFlight internal tester group
- Google Play Console app record
- Internal testing track
- Web staging/prod domains

