# Rent-or-Let Platform

Multi-tenant property management platform. Shared codebase, per-client branding and data.

**Tenants:** Property Management Services (`pms`), Veri Properties (`veri-properties`)

## Monorepo structure

```
apps/web/           Shared Next.js application
packages/config/    Tenant config loader
packages/database/  Drizzle migrations
tenants/            Per-client branding and seed data
```

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Turborepo** + **pnpm** workspaces
- **Neon Postgres** + Drizzle ORM
- **Neon Auth** (Better Auth)
- **Vercel** hosting + cron

## Getting started

```bash
npm install
cp .env.example apps/web/.env.local
# Set DATABASE_URL, TENANT_ID=pms, Neon Auth credentials
TENANT_ID=pms npm run db:setup
TENANT_ID=pms npm run dev
```

## Client onboarding

See [docs/client-setup.md](docs/client-setup.md) for adding a new agency tenant.

For Veri Properties deployment, see [docs/veri-properties-deploy.md](docs/veri-properties-deploy.md).

## Neon setup

See [docs/neon-setup.md](docs/neon-setup.md).

## Portal sync

See [docs/portal-onboarding.md](docs/portal-onboarding.md).
