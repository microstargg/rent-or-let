# Rent-or-Let Platform

Modern property management platform for Property Management Services (rent-or-let.co.uk).

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Neon Postgres** + Drizzle ORM
- **Neon Auth** (Better Auth) for staff login
- **Vercel Blob** for property images
- **Vercel** hosting + cron for portal sync

## Getting started

```bash
npm install
cp .env.example .env.local
# Add DATABASE_URL and Neon Auth credentials
npm run db:push
npm run dev
```

## Neon setup

See the full guide: [docs/neon-setup.md](docs/neon-setup.md)

Quick start:

1. Create/use your Neon project and copy the connection string into `DATABASE_URL`
2. In Neon Console → **Auth** → Enable Auth, copy the Auth URL to `NEON_AUTH_BASE_URL`
3. Generate cookie secret: `openssl rand -base64 32` → `NEON_AUTH_COOKIE_SECRET`
4. Push schema: `npm run db:push`
5. Sign up at `/sign-up`, then grant access in Neon SQL Editor:

```sql
INSERT INTO staff_profiles (id, email, full_name, role)
VALUES ('neon-auth-user-id', 'staff@example.com', 'Staff Name', 'admin');
```

## Portal sync

See [docs/portal-onboarding.md](docs/portal-onboarding.md).

## Documentation

- [Neon setup guide](docs/neon-setup.md)
- [Portal onboarding](docs/portal-onboarding.md)
- [Security audit](docs/security-audit.md)
- [Let Flow integration](docs/let-flow-integration.md)
