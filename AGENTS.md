# AGENTS.md

## Cursor Cloud specific instructions

This is a single Next.js 15 (App Router) app — a property management / lettings platform. There is no monorepo, Docker, or local database; the database (Neon Postgres) and auth (Neon Auth) are hosted SaaS with no local emulator.

### Preferred env source (no local `.env` file needed)
Secrets live in the Vercel project (Neon is wired there). Prefer this over copying a machine-local `.env`:

1. Ensure Vercel CLI is on `PATH` (`~/.local/bin/vercel` in this VM) and authenticated (`VERCEL_TOKEN` or `vercel login`).
2. Link once: `vercel link --yes --project rent-or-let` (creates `.vercel/`, which is gitignored).
3. Pull secrets: `vercel env pull .env.local --yes`
4. Then run `npm run dev` (or `vercel dev`) on http://localhost:3000.

Production URL: https://rent-or-let.vercel.app (GitHub homepage). Note: `www.rent-or-let.co.uk` is still the legacy WordPress site, not this Next app.

Until Vercel CLI auth/`env pull` is available, use the live Vercel deployment for end-to-end checks against real Neon/Auth, and keep local `npm run dev` for public UI work (seed-data fallback when `.env.local` is missing).

### Services / commands
- Dev server: `npm run dev` — serves everything on http://localhost:3000. This is the only long-running service.
- Lint: `npm run lint`. There is no unit/e2e test runner; `scripts/test-phase-*.ts` are `tsx` integration scripts that require a live `DATABASE_URL`.
- DB schema: `npm run db:push` (drizzle-kit) or `npm run db:setup` (`scripts/setup-db.mjs`). Both require `DATABASE_URL` and a real Neon instance.

### Non-obvious caveats
- No env vars are required to run the dev server. Public pages (`/`, `/properties`, property detail) fall back to built-in seed data when `DATABASE_URL` is unset (see `src/lib/data/properties.ts`), so property browsing/search works out of the box.
- Auth-gated areas (`/admin`, landlord/renter portals, most `/api/*` routes) need hosted Neon Auth: `NEON_AUTH_BASE_URL` + `NEON_AUTH_COOKIE_SECRET` (see `src/lib/auth/server.ts`, which throws if unset), plus `DATABASE_URL` and a `staff_profiles` row (see `docs/neon-setup.md`). Pull these via `vercel env pull` rather than pasting Neon values by hand when possible.
- `npm run build` (production build) FAILS without `NEON_AUTH_BASE_URL`: the `/api/auth/[...path]` route instantiates Neon Auth during "Collecting page data". `npm run dev` does NOT do this, so use dev for local work unless you have Neon secrets (or a pulled `.env.local`).
- Optional integrations (Vercel Blob, Stripe, Resend, Rightmove/OnTheMarket RTDF, cron) are all feature-gated and skipped when their env vars are unset; local image uploads fall back to `public/uploads/`.
