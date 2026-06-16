# Neon Database Setup

The platform uses **Neon Postgres** (not Supabase) with **Drizzle ORM** and **Neon Auth** for staff login.

## 1. Create a Neon project

1. Sign in at [Neon Console](https://console.neon.tech)
2. Create a project (or use an existing one)
3. Open **Dashboard → Connect** and copy the connection string
   - Prefer the **pooler** URL for serverless (Vercel/Next.js)
   - Ensure `?sslmode=require` is included

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon Console → Connect → connection string (pooler recommended) |
| `NEON_AUTH_BASE_URL` | Neon Console → Auth → Enable Auth → copy Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | Run `openssl rand -base64 32` (Windows: use Git Bash or WSL) |

Optional for full functionality:

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for property images in production |
| `CRON_SECRET` | Secures `/api/cron/portal-sync` |
| `RESEND_API_KEY` | Outbound email |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

## 3. Install dependencies and push schema

```bash
npm install
npm run db:push
```

Alternative — run the initial SQL migration directly:

```bash
npm run db:setup
```

This applies `drizzle/0000_initial.sql`, including seed branch and sample properties.

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
   - Your production domain (e.g. `https://www.rent-or-let.co.uk`)
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
4. Add your production domain to Neon Auth **trusted domains** (e.g. `https://www.rent-or-let.co.uk`)

After Google sign-in, users still need a `staff_profiles` row before accessing `/admin` (same as email sign-up).

## 5. Create the first staff user

Staff access requires **both** a Neon Auth account and a row in `staff_profiles`.

### Step A — Create auth account

1. Start the app: `npm run dev`
2. Visit `/sign-up` and create an account (email/password or **Sign up with Google**)
3. You will be redirected to login (admin access is not granted yet)

### Step B — Grant staff access

Find the Neon Auth user ID (from Neon Console → Auth → Users, or from the session after sign-in), then run in Neon SQL Editor:

```sql
INSERT INTO staff_profiles (id, email, full_name, role)
VALUES ('your-neon-auth-user-id', 'you@example.com', 'Your Name', 'admin');
```

The `id` must exactly match the Neon Auth user ID.

### Step C — Sign in

Visit `/login` and sign in. You should reach `/admin`.

## 6. Property images

- **Production:** create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`
- **Local dev:** images save to `public/uploads/` automatically (no token needed)

## 7. Deploy to Vercel

1. Link the repo to Vercel
2. Add environment variables in **Project Settings → Environment Variables**:
   - `DATABASE_URL`
   - `NEON_AUTH_BASE_URL`
   - `NEON_AUTH_COOKIE_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (if using Blob)
   - `CRON_SECRET`
   - Portal credentials as needed (see [portal-onboarding.md](./portal-onboarding.md))
3. Deploy — Vercel runs `npm run build`
4. After first deploy, run `npm run db:push` locally against production `DATABASE_URL`, or apply `drizzle/0000_initial.sql` in Neon SQL Editor
5. Create staff user(s) as in step 5

The cron job in `vercel.json` calls `/api/cron/portal-sync` every 5 minutes.

## Architecture notes

| Concern | Implementation |
|---------|----------------|
| Database | Neon Postgres via `@neondatabase/serverless` + Drizzle |
| Auth | Neon Auth (Better Auth) — session cookies |
| Staff authorization | `staff_profiles` table checked in admin layout and API routes |
| Migrations | Drizzle schema in `src/lib/db/schema.ts`, SQL in `drizzle/` |
| Legacy Supabase | Removed — do not use `supabase/` folder if present |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth errors / redirect loops | Ensure `NEON_AUTH_BASE_URL` is set and matches Neon Console |
| "Not authorized for admin access" | Insert user into `staff_profiles` with correct Neon Auth user ID |
| DB connection errors | Check `DATABASE_URL`, use pooler URL, verify `sslmode=require` |
| Properties show seed data only | `DATABASE_URL` missing or schema not pushed — run `npm run db:push` |
| Images fail in production | Set `BLOB_READ_WRITE_TOKEN` on Vercel |
