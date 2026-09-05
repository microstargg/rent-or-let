# Neon Database Setup

The platform uses **Neon Postgres** (not Supabase) with **Drizzle ORM** and **Neon Auth** for staff login.

## 1. Create a Neon project

1. Sign in at [Neon Console](https://console.neon.tech)
2. Create a project (or use an existing one)
3. Open **Dashboard → Connect** and copy the connection string
   - Prefer the **pooler** URL for serverless (Vercel/Next.js)
   - Ensure `?sslmode=require` is included

## 2. Environment variables

Copy `.env.example` to `apps/web/.env.local` and set `AGENCY_SLUG=pms`:

```bash
cp .env.example apps/web/.env.local
```

| Variable | Source |
|----------|--------|
| `AGENCY_SLUG` | `pms` (local/CI fallback; production uses the Host header) |
| `DATABASE_URL` | Neon Console → Connect → connection string (pooler recommended) |
| `NEON_AUTH_BASE_URL` | Neon Console → Auth → Enable Auth → copy Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | Run `openssl rand -base64 32` (Windows: use Git Bash or WSL) |

Optional for full functionality:

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for property images in production |
| `CRON_SECRET` | Secures `/api/cron/portal-sync` |
| `RESEND_API_KEY` | Outbound email |
| `NEXT_PUBLIC_SITE_URL` | Local marketing site (`http://localhost:3001`). Production uses `AGENCY_*_PUBLIC_SITE_URL`. |

## 3. Install dependencies and push schema

```bash
npm install
npm run db:push
```

Alternative — run the initial SQL migration directly:

```bash
npm run db:setup
```

This applies every file in `packages/database/drizzle/` plus seed from `tenants/<AGENCY_SLUG>/seed.sql`.

Inspect the database with Drizzle Studio:

```bash
npm run db:studio
```

## 4. Enable Neon Auth

1. In Neon Console, open your project
2. Go to **Auth** → **Enable Auth**
3. Copy the Auth URL into `NEON_AUTH_BASE_URL` in `.env.local`
4. Under allowed origins, add:
   - `http://localhost:3000` (local dev)
   - The platform host (e.g. `https://pms.letflow.app`), **not** the marketing domain
5. Set `NEON_AUTH_COOKIE_SECRET` to a random 32+ character secret

Restart the dev server after changing auth env vars.

## 4b. Enable Google OAuth

Google sign-in/sign-up is built into the login and sign-up pages. Configure it in Neon Console:

### Development (shared credentials)

1. Neon Console → **Auth** → **Providers**
2. Enable **Google**
3. No Google Cloud credentials needed for local dev — Neon provides shared credentials

Ensure trusted domains include `http://localhost:3000`.

### Production (custom credentials)

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (Web application)
2. Add authorized redirect URI:

```
{NEON_AUTH_BASE_URL}/callback/google
```

Example: `https://ep-xxx.neonauth.eu-west-2.aws.neon.tech/neondb/auth/callback/google`

3. Copy Client ID and Client Secret into Neon Console → **Auth** → **Providers** → **Google**
4. Add the platform host to Neon Auth **trusted domains** (e.g. `https://pms.letflow.app`)

After Google sign-in, users still need a `staff_profiles` row for **this agency** before accessing `/`. The same Google account can be staff on more than one agency.

## 5. Create the first staff user

Staff access requires **both** a Neon Auth account and a row in `staff_profiles`.

### Step A — Create auth account

1. Start the app: `npm run dev`
2. Visit `/sign-up` and create an account (email/password or **Sign up with Google**)
3. You will be redirected to login (admin access is not granted yet)

### Step B — Grant staff access

Prefer **Settings → Team** on that agency's host (e.g. `https://veri.letflow.app/settings`). That copies an existing Neon Auth user id from another agency, or invites them to gain access on next sign-in.

To grant access in SQL, use the Neon Auth user ID (Neon Console → Auth → Users) **and** the agency slug. Primary key is `(agency_id, id)`, so the same user id can exist on `pms` and `veri-properties`:

```sql
INSERT INTO staff_profiles (id, agency_id, email, full_name, role)
VALUES ('your-neon-auth-user-id', 'veri-properties', 'you@example.com', 'Your Name', 'admin');
```

The `id` must exactly match the Neon Auth user ID. Apply `0013_agency_membership.sql` (or deploy; staff routes apply it at runtime) before inserting a second agency row.

### Step C — Sign in

Visit `/login` and sign in. You should reach `/` (legacy `/admin` redirects there).

## 6. Property images

- **Production:** create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`
- **Local dev:** images save to `public/uploads/` automatically (no token needed)

## 7. Deploy to Vercel

One platform project (`apps/web`) serves every agency. See [client-setup.md](./client-setup.md).

1. Root Directory `apps/web` on the `letflow-platform` project
2. Add `pms.letflow.app` and `veri.letflow.app`
3. Set shared `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `AGENCY_SLUGS`, Blob, cron, and portal credentials — not build-time `TENANT_ID`. Per-agency site hooks use `AGENCY_*_PUBLIC_SITE_URL` / `REVALIDATE_*`.
4. Optional site project: Root Directory `apps/site`, domains `www.rent-or-let.co.uk` and `veri.properties`
5. Apply shared migrations (`0012_agencies_shared_db.sql`, `0013_agency_membership.sql`). New agencies: `createAgency({ slug, name, ... })` — no new Neon project
6. Create staff user(s) as in step 5 (Neon Auth + `staff_profiles` with that host's `agency_id`)

Cron jobs in `apps/web/vercel.json` iterate every agency in `AGENCY_SLUGS`; each loop filters rows by that agency's `agency_id`.

## Architecture notes

| Concern | Implementation |
|---------|----------------|
| Database | Shared Neon Postgres; `agency_id` on operational tables |
| Auth | Neon Auth (Better Auth) — session cookies; trusted origins per platform host |
| Staff authorization | `staff_profiles` table checked in staff layout and API routes |
| Migrations | Drizzle schema in `apps/web/src/lib/db/schema.ts`, SQL in `packages/database/drizzle/` |
| New agency | `createAgency` helper + branding folder; self-serve UI later |
| Legacy Supabase | Removed — do not use `supabase/` folder if present |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth errors / redirect loops | Ensure `NEON_AUTH_BASE_URL` is set and matches Neon Console |
| "Not authorized for admin access" | Add them under Settings → Team on that subdomain, or insert `staff_profiles` with the Neon Auth user ID **and** `agency_id` |
| DB connection errors | Check `DATABASE_URL`, use pooler URL, verify `sslmode=require` |
| Properties show seed data only | `DATABASE_URL` missing or schema not pushed — run `npm run db:push` |
| Images fail in production | Set `BLOB_READ_WRITE_TOKEN` on Vercel |
