# AGENTS.md

## Cursor Cloud specific instructions

This is a single Next.js 15 (App Router) app — a property management / lettings platform. There is no monorepo, Docker, or local database; the database (Neon Postgres) and auth (Neon Auth) are hosted SaaS with no local emulator.

### Services / commands
- Dev server: `npm run dev` — serves everything on http://localhost:3000. This is the only long-running service.
- Lint: `npm run lint`. There is no unit/e2e test runner; `scripts/test-phase-*.ts` are `tsx` integration scripts that require a live `DATABASE_URL`.
- DB schema: `npm run db:push` (drizzle-kit) or `npm run db:setup` (`scripts/setup-db.mjs`). Both require `DATABASE_URL` and a real Neon instance.

### Non-obvious caveats
- No env vars are required to run the dev server. Public pages (`/`, `/properties`, property detail) fall back to built-in seed data when `DATABASE_URL` is unset (see `src/lib/data/properties.ts`), so property browsing/search works out of the box.
- Auth-gated areas (`/admin`, landlord/renter portals, most `/api/*` routes) need hosted Neon Auth: `NEON_AUTH_BASE_URL` + `NEON_AUTH_COOKIE_SECRET` (see `src/lib/auth/server.ts`, which throws if unset), plus `DATABASE_URL` and a `staff_profiles` row (see `docs/neon-setup.md`). These cannot be exercised without user-provided Neon credentials.
- `npm run build` (production build) FAILS without `NEON_AUTH_BASE_URL`: the `/api/auth/[...path]` route instantiates Neon Auth during "Collecting page data". `npm run dev` does NOT do this, so use dev for local work unless you have Neon secrets.
- Optional integrations (Vercel Blob, Stripe, Resend, Rightmove/OnTheMarket RTDF, cron) are all feature-gated and skipped when their env vars are unset; local image uploads fall back to `public/uploads/`.
