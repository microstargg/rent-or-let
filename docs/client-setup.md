# Client setup playbook

Use this checklist when onboarding a letting agency onto LetFlow.

**Live today:** `pms` (Property Management Services / rent-or-let) and `veri-properties` (empty agency on the shared DB).

## Architecture

- **One platform app:** [`apps/web`](../apps/web) on `{slug}.letflow.app` — staff, renter portal, landlord portal, APIs
- **Optional public site:** [`apps/site`](../apps/site) on the agency's own domain — listings are pulled from the platform API (not copied)
- **Shared data:** one Neon Postgres + Neon Auth for all agencies; rows are scoped by `agency_id`
- **Control plane:** hostname → slug → ALS agency context → `WHERE agency_id = slug`. Do not set `TENANT_ID` at build time for production.

`veri.letflow.app` is an alias for registry slug `veri-properties`.

## 1. Add branding (known agencies)

Create `tenants/<slug>/` with:

| File | Purpose |
|------|---------|
| `config.ts` | Branding (name, domain, colours, payment ref prefix) |
| `site.ts` | Marketing copy used by the optional website |
| `theme.css` | Public-site colour overrides (also listed in `agency-themes.css`) |
| `assets/icon.svg` | Favicon (copied to `public/agencies/<slug>/` at prepare time) |
| `seed.sql` | Optional seed (prefer `createAgency` for empty agencies) |

Register the slug in [`packages/config/src/registry.ts`](../packages/config/src/registry.ts). Short hostnames (`veri` → `veri-properties`) go in [`packages/config/src/host.ts`](../packages/config/src/host.ts).

## 2. Create the agency row

On the shared database, call [`createAgency`](../apps/web/src/lib/db/create-agency.ts):

```ts
await createAgency({
  slug: "acme-lettings",
  name: "Acme Lettings",
  platformHost: "acme-lettings.letflow.app",
  publicSiteUrl: "https://acme.example", // optional
});
```

That inserts `agencies` + a default `branches` row. Future self-serve signup is: Auth user → `createAgency` → `staff_profiles` → redirect to `{slug}.letflow.app`.

## 3. Provision infrastructure

| Service | Purpose |
|---------|---------|
| **Neon** (shared) | One Postgres + Auth project for all agencies (`rent-or-let`) |
| **Vercel** (platform) | One LetFlow project (`apps/web`) — add `{slug}.letflow.app` |
| **Vercel** (site, optional) | One site project (`apps/site`) — add their marketing domain |
| **Vercel Blob** | Property images |
| **Resend / Stripe / Rightmove / OTM** | Configured per agency |

Apex `letflow.app` stays on the sales site project. Do not attach it to the platform. Do **not** create a new Neon project per client.

## 4. Environment variables

On the **single platform** Vercel project, set shared Auth/DB once, then per-agency site hooks:

```
DATABASE_URL=...                    # shared Neon (rent-or-let)
NEON_AUTH_BASE_URL=...
NEON_AUTH_COOKIE_SECRET=...
AGENCY_SLUGS=pms,veri-properties

AGENCY_PMS_PUBLIC_SITE_URL=https://www.rent-or-let.co.uk
AGENCY_PMS_WEBSITE_ENABLED=true
AGENCY_PMS_REVALIDATE_URL=https://www.rent-or-let.co.uk/api/revalidate
AGENCY_PMS_REVALIDATE_SECRET=...

AGENCY_VERI_PROPERTIES_PUBLIC_SITE_URL=https://veri.properties
AGENCY_VERI_PROPERTIES_WEBSITE_ENABLED=true
AGENCY_VERI_PROPERTIES_REVALIDATE_URL=https://veri.properties/api/revalidate
AGENCY_VERI_PROPERTIES_REVALIDATE_SECRET=...
```

Optional per-agency `AGENCY_*_DATABASE_URL` / `AGENCY_*_NEON_AUTH_*` still override the shared defaults if needed; isolation no longer requires them.

Backend-only clients omit `PUBLIC_SITE_URL` and set `WEBSITE_ENABLED=false`.

Staff sign in at `https://pms.letflow.app` or `https://veri.letflow.app`. Bookmark `/admin` still 301s to `/`.

`www.rent-or-let.co.uk` is assigned to the site project. Point DNS at Vercel with `A www.rent-or-let.co.uk 76.76.21.21` (nameservers today are still the registrar’s).

Local only: `NEXT_PUBLIC_PLATFORM_URL=http://localhost:3000` and `NEXT_PUBLIC_SITE_URL=http://localhost:3001`.

## 5. Local development

```bash
npm install
cp .env.example apps/web/.env.local
cp .env.example apps/site/.env.local
# Platform
npm run dev -w @repo/web
# Optional site (port 3001)
npm run dev -w @repo/site
```

Open `http://localhost:3000` for LetFlow and `http://localhost:3001` for the public site. Set `AGENCY_SLUG=pms` (or use `pms.localhost`).

## 6. Database

```bash
# Shared schema (all agencies)
npm run db:setup
# Or seed one agency folder after migrations
AGENCY_SLUG=<slug> npm run db:setup
```

Applies every file in `packages/database/drizzle/` then `tenants/<slug>/seed.sql`. Uses shared `DATABASE_URL` (optional `AGENCY_{SLUG}_DATABASE_URL` override).

Migration `0012_agencies_shared_db.sql` adds `agencies`, stamps existing rows as `pms`, and seeds empty `veri-properties`.

## 7. Public listings API

Optional websites read published listings from:

- `GET https://{slug}.letflow.app/api/v1/public/listings`
- `GET https://{slug}.letflow.app/api/v1/public/listings/{slug}`
- `POST https://{slug}.letflow.app/api/v1/public/enquiries` (and `/applications`, `/complaints`)

When a listing is published, the platform pings `AGENCY_*_REVALIDATE_URL` so the site ISR cache refreshes.

## Rules for developers

- Platform changes → `apps/web` or `packages/*` → every agency on the next deploy
- Agency branding/copy → `tenants/<slug>/` only
- Every query must filter (or stamp) `agency_id` via `getAgency().slug`
- Do not put database URLs in client-sent tenant config
- Do not copy property rows into the marketing site
