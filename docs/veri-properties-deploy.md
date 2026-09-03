# Veri Properties deployment

A **second Vercel project** (`veri-properties`, `prj_gNJFdThvbo1IyUWsUl6KTdTDVpUP`) is linked to the same GitHub repo as PMS (`microstargg/rent-or-let`).

Dashboard:

- PMS: https://vercel.com/bens-projects-a61fe932/rent-or-let
- Veri: https://vercel.com/bens-projects-a61fe932/veri-properties

To set Root Directory `apps/web` and `TENANT_ID` on both projects (needs a personal Vercel token):

```bash
$env:VERCEL_TOKEN="..."
node scripts/configure-vercel-tenants.mjs
```

## Vercel project settings

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Build Command | default (`prebuild` runs `prepare-tenant.mjs`) |
| Install Command | `npm ci` |

The `@repo/web` package runs `prepare-tenant.mjs` automatically via `prebuild` and `predev`.

## Required environment variables

Set these in the Veri Properties Vercel project (isolated from PMS):

```
TENANT_ID=veri-properties
DATABASE_URL=<Veri Neon connection string>
NEON_AUTH_BASE_URL=<Veri Neon Auth URL>
NEON_AUTH_COOKIE_SECRET=<new secret>
NEXT_PUBLIC_SITE_URL=https://veri.properties
BLOB_READ_WRITE_TOKEN=<Veri Vercel Blob token>
CRON_SECRET=<new secret>
RESEND_*=<Veri Resend config>
STRIPE_*=<optional, Veri Stripe>
```

## Infrastructure status (provisioned)

| Service | Status |
|---------|--------|
| **Neon** `veri-properties` (`gentle-wave-51922309`, eu-west-2) | Done — schema + seed applied |
| **Neon Auth** (Better Auth) | Done — base URL on Vercel; trusted domains include production + localhost |
| **Vercel env** | `DATABASE_URL`, `NEON_AUTH_*`, `CRON_SECRET`, `TENANT_ID`, `NEXT_PUBLIC_SITE_URL`, `RESEND_*` |
| **Resend** | Domain `veri.properties` verified (sending); use `Veri Properties <info@veri.properties>` |
| **Vercel Blob** | Done — store `veri-props` (`store_pYzPucQJlyMEoX2S`) linked; token on project |
| **Stripe** | Optional — add later if card payments needed |

## Database setup

After first deploy (or locally):

```bash
TENANT_ID=veri-properties npm run db:setup
```

This applies shared migrations from `packages/database/drizzle/` and runs `tenants/veri-properties/seed.sql`.

## PMS project update

Update the existing rent-or-let Vercel project:

1. Set **Root Directory** to `apps/web`
2. Add `TENANT_ID=pms` to environment variables
3. Reconnect build — pushes to `main` now deploy both projects

## Custom domain

Point `veri.properties` (and `www` if used) to the Veri Vercel project and set `NEXT_PUBLIC_SITE_URL=https://veri.properties`.
