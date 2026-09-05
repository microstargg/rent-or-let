# LetFlow / Rent-or-Let platform

Lettings operations platform. One LetFlow deploy on `{slug}.letflow.app`, one shared Neon database scoped by `agency_id`, optional public website on the agency's own domain.

**Agencies:** Property Management Services (`pms`), Veri Properties (`veri-properties`)

## Monorepo structure

```
apps/web/           LetFlow platform (admin, portals, APIs)
apps/site/          Optional advertising site (pulls listings from the platform API)
packages/config/    Agency registry + runtime control plane
packages/site-core/ Public listing/branding API contract
packages/database/  Drizzle migrations
tenants/            Per-agency branding and seed data
```

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Turborepo** + **pnpm** workspaces
- **Neon Postgres** + Drizzle ORM
- **Neon Auth**
- **Vercel** hosting + cron

## Getting started

```bash
npm install
cp .env.example apps/web/.env.local
# Set DATABASE_URL, AGENCY_SLUG=pms, Neon Auth credentials
AGENCY_SLUG=pms npm run db:setup
npm run dev -w @repo/web
```

Staff UI: `http://localhost:3000` (dashboard at `/`, legacy `/admin` redirects).

Optional public site: `npm run dev -w @repo/site` → `http://localhost:3001`.

## Client onboarding

See [docs/client-setup.md](docs/client-setup.md).

PMS is the live agency (`pms.letflow.app` + `www.rent-or-let.co.uk`). Veri is rebuilt from the PMS schema — see [docs/veri-properties-deploy.md](docs/veri-properties-deploy.md).

## Neon setup

See [docs/neon-setup.md](docs/neon-setup.md).

## Portal sync

See [docs/portal-onboarding.md](docs/portal-onboarding.md).
