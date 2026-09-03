# Client setup playbook

Use this checklist when onboarding a new letting agency on the shared platform monorepo.

**Current tenants:** `pms` (Property Management Services), `veri-properties` (Veri Properties).

## Architecture

- **Shared code:** `apps/web`, `packages/*` — features and bug fixes deploy to all clients
- **Per-client branding:** `tenants/<tenant-id>/` — copy, theme, logo, payment ref prefix
- **Per-client data:** separate Neon database per Vercel deployment

## 1. Add a tenant folder

Create `tenants/<tenant-id>/` with:

| File | Purpose |
|------|---------|
| `config.ts` | `TenantConfig` (name, domain, colours, payment ref prefix) |
| `site.ts` | Marketing copy, contact, fees |
| `theme.css` | CSS variable overrides |
| `assets/icon.svg` | Favicon (copied to app at build time) |
| `seed.sql` | Initial branch row and optional sample properties |

Register the tenant in [`packages/config/src/registry.ts`](../packages/config/src/registry.ts).

Add the tenant id to the CI matrix in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## 2. Provision infrastructure

Each client gets **isolated** resources:

| Service | Purpose |
|---------|---------|
| **Neon** project | Postgres + Auth |
| **Vercel** project | Hosting + cron (root: `apps/web`) |
| **Vercel Blob** | Property images |
| **Resend** | Inbound email + optional outbound |
| **Stripe Connect** | Optional card “Pay now” in the renter portal |
| **Rightmove / OTM** | Portal sync mTLS credentials |

See [veri-properties-deploy.md](veri-properties-deploy.md) for a full Vercel + env example.

## 3. Environment variables

Copy [`.env.example`](../.env.example) to `apps/web/.env.local` and set:

- `TENANT_ID` — e.g. `pms` or `veri-properties`
- `DATABASE_URL` — Neon connection string
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
- `NEXT_PUBLIC_SITE_URL` — e.g. `https://www.client-agency.co.uk`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET` — for `/api/cron/rent` and `/api/cron/compliance`
- `RESEND_*` — inbound webhooks + `RESEND_INBOUND_DOMAIN`
- `STRIPE_*` — optional card payments
- `RIGHTMOVE_*`, `OTM_*` — portal sync

Mirror the same variables in the Vercel project settings (`TENANT_ID` included).

## 4. Local development

```bash
npm install
TENANT_ID=pms npm run dev
```

`prepare-tenant.mjs` runs automatically before dev/build to copy favicon and theme.

## 5. Database

Apply shared schema and tenant seed:

```bash
TENANT_ID=<tenant-id> npm run db:setup
```

For ongoing schema changes:

```bash
npm run db:push
```

Migrations live in `packages/database/drizzle/`. Tenant-specific seed data lives in `tenants/<tenant-id>/seed.sql`.

## 6. Staff access

1. Visit `/sign-up` and create an account.
2. Grant admin in Neon SQL Editor:

```sql
INSERT INTO staff_profiles (id, email, full_name, role)
VALUES ('neon-auth-user-id', 'staff@agency.co.uk', 'Staff Name', 'admin');
```

## 7. Agency configuration (admin)

In `/admin/settings`:

1. **Client money pay-in details** — account name, sort code, account number for standing orders
2. **Stripe Connect** — optional Express account for renter portal card payments
3. **Maintenance inbox** — configure Resend inbound MX for `maintenance+{token}@domain`
4. Point Resend webhook to `https://your-domain/api/webhooks/inbound-email`

Payment references use the tenant prefix from `config.ts` (e.g. `ROL-`, `VER-`).

## 8. Portal sync

See [portal-onboarding.md](portal-onboarding.md) for Rightmove and OnTheMarket RTDF setup.

## 9. Deploy

Create a **new Vercel project** pointing at this repo with:

- **Root Directory:** `apps/web`
- **`TENANT_ID`** env var set to the client tenant id

Push to `main` — all connected Vercel projects rebuild with the latest platform code. Each project keeps its own branding (`TENANT_ID`) and database.

## Rules for developers

- Platform changes → edit `apps/web` or `packages/*` → all clients updated on deploy
- Client branding/copy → edit only `tenants/<client>/` → affects that tenant only
- Do not hardcode agency names or domains in shared code
