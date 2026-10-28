# Demo portal (demo.letflow.app)

A fictional agency, **LetFlow Demo Lettings** (registry slug `demo`), for sales demos and a
public "try it" page. Every name, address, phone number and figure is made up.

## Isolation

- The demo runs on its **own Neon project** (`letflow-demo`) with its own Postgres and its own
  Neon Auth. It never touches the shared `rent-or-let` database used by PMS and Veri.
- `demo` is listed in `ISOLATED_AGENCY_SLUGS` (`packages/config/src/runtime.ts`). An isolated
  agency never falls back to the shared `DATABASE_URL` or `NEON_AUTH_*`. If its own variables
  are missing, demo.letflow.app errors instead of reading production data.
- The reset refuses to run if `AGENCY_DEMO_DATABASE_URL` points at the shared database host,
  or if the demo database contains any other agency's properties, landlords, renters or tenancies.

## Getting in

Every page on demo.letflow.app first asks for a shared access code (`/demo-access`). The code
is `DEMO_ACCESS_CODE`; a correct entry sets an `lf-demo-access` cookie for 30 days. Changing the
code signs everyone out of the demo. If `DEMO_ACCESS_CODE` is unset, the demo is closed to
everyone. The cron route and static assets skip the gate.

After the code, `demo.letflow.app/login` shows three buttons: explore as letting agent, landlord or tenant.
Each signs in to a shared account (`agent@`, `landlord@`, `renter@demo.letflow.app`) using
`DEMO_LOGIN_PASSWORD`. The first click creates the account in the demo's Neon Auth. Visitors
cannot change those accounts' passwords, emails or sessions (blocked in `/api/auth`).

## Data and the nightly reset

- `apps/web/src/lib/demo/dataset.ts` builds the data in memory, dated relative to today:
  30 properties (26 let, 4 marketed), 15 landlords, 28 renters, 12 months of rent invoices,
  payments, allocations and ledger, three arrears cases, six months of landlord statements and
  payouts, maintenance jobs, compliance, inspections, enquiries, viewings and applications.
- `/api/cron/demo-reset` (daily at 03:00 UTC, `CRON_SECRET` bearer) truncates the demo
  database's app tables and reloads the data in one transaction, then re-links the demo logins.
- To reset by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://demo.letflow.app/api/cron/demo-reset`

## Switched off in the demo

Outbound email, Stripe (online rent payments and Connect onboarding), Rightmove/OnTheMarket
sync, and AI assist (set `DEMO_AI_ENABLED=true` to allow it).

## Environment (platform Vercel project)

```
AGENCY_DEMO_DATABASE_URL=...            # letflow-demo pooled connection string
AGENCY_DEMO_NEON_AUTH_BASE_URL=...      # letflow-demo Neon Auth base URL
AGENCY_DEMO_NEON_AUTH_COOKIE_SECRET=... # random 32+ bytes, demo only
DEMO_LOGIN_PASSWORD=...                 # random, shared by the three demo accounts
DEMO_ACCESS_CODE=...                    # code visitors enter before seeing anything
```

Add `demo.letflow.app` as a domain on the platform project. If `AGENCY_SLUGS` is set, the
rent and compliance crons only visit the agencies listed there; the demo does not need to be in it.

## Schema changes

New migrations in `packages/database/drizzle/` must also be applied to the `letflow-demo`
database: `AGENCY_SLUG=demo AGENCY_DEMO_DATABASE_URL=... npm run db:setup`.
