# Client setup playbook

Use this checklist when cloning rent-or-let for a new letting agency client.

## 1. Fork or duplicate the repository

```bash
git clone https://github.com/your-org/rent-or-let.git new-agency-site
cd new-agency-site
```

Or use GitHub **Use this template** if enabled.

## 2. Rebrand

| Item | File |
|------|------|
| Marketing copy, contact, fees | [`src/lib/content/site.ts`](../src/lib/content/site.ts) |
| Site title / metadata | [`src/app/layout.tsx`](../src/app/layout.tsx) |
| Admin label | [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx) |
| Logo / favicon | [`public/`](../public/) |

## 3. Provision infrastructure

Each client gets **isolated** resources:

| Service | Purpose |
|---------|---------|
| **Neon** project | Postgres + Auth |
| **Vercel** project | Hosting + cron |
| **Vercel Blob** | Property images |
| **Resend** | Inbound email + optional outbound |
| **Stripe Connect** | Renter portal rent payments (per agency) |
| **Rightmove / OTM** | Portal sync mTLS credentials |

## 4. Environment variables

Copy [`.env.example`](../.env.example) to `.env.local` and set:

- `DATABASE_URL` — Neon connection string
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
- `NEXT_PUBLIC_SITE_URL` — e.g. `https://www.client-agency.co.uk`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET` — for `/api/cron/rent` and `/api/cron/compliance`
- `RESEND_*` — inbound webhooks + `RESEND_INBOUND_DOMAIN` + optional `RESEND_FROM_EMAIL` for outbound invites
- `STRIPE_*` — platform secret + webhook secret
- `RIGHTMOVE_*`, `OTM_*` — portal sync (optional `OTM_RTDF_URL`)

Mirror the same variables in the Vercel project settings.

## 5. Database

```bash
npm install
npm run db:push
```

Seed the default branch (adjust for the client):

```sql
INSERT INTO branches (id, name, address, phone, settings)
VALUES (
  gen_random_uuid(),
  'Agency Name',
  'Office address',
  '01onal 000000',
  '{}'::jsonb
);
```

Or update the existing seed branch in [`drizzle/0000_initial.sql`](../drizzle/0000_initial.sql) before first push.

## 6. Staff access

1. Visit `/sign-up` and create an account.
2. Grant the **first** admin in Neon SQL Editor:

```sql
INSERT INTO staff_profiles (id, email, full_name, role)
VALUES ('neon-auth-user-id', 'staff@agency.co.uk', 'Staff Name', 'admin');
```

3. Further staff: **Admin → Settings → Staff access → Invite staff** (emails when Resend outbound is configured; invite link is always copied to clipboard).

## 7. Agency configuration (admin)

In `/admin/settings`:

1. **Stripe Connect** — connect the agency’s Stripe Express account for renter payments.
2. **Maintenance inbox** — note the `maintenance+{token}@domain` address; configure Resend inbound MX.
3. Point Resend webhook to `https://your-domain/api/webhooks/inbound-email`.
4. Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (verified domain) so portal/staff invites and contractor job emails send automatically.

## 8. Portal sync

See [portal-onboarding.md](portal-onboarding.md) for Rightmove and OnTheMarket RTDF setup. Saving a property runs sync inline (no portal-sync cron).

## 9. Renter and landlord portals

1. Add renters under **Admin → Renters** and landlords under **Admin → Landlords**.
2. Create tenancies under **Admin → Tenancies**.
3. Click **Portal invite** on a renter or landlord row (email + clipboard).
4. Recipient signs up / signs in with the invited email and accepts → `/portal` or `/landlord-portal`.

## 10. Deploy

```bash
git push origin main
```

Connect the Vercel project, add domains (e.g. `www.client-agency.co.uk`), and verify:

- Public site loads
- `/admin` staff login works
- Cron runs on the 1st of each month (`vercel.json` → `/api/cron/rent`) and daily compliance (`/api/cron/compliance`)
- Stripe webhook points to `/api/webhooks/stripe`

## 11. Go-live UAT (persona checklist)

Run through these before handing the clone to the agency. Optional automated cover: `npm run test:e2e:public` always; full persona E2E when `E2E_*` credentials are set; `npm run test:phase` with `DATABASE_URL`.

### PublicVisitor

- [ ] `/`, `/properties`, property detail, `/landlords`, `/tenants`, `/about` render branded copy
- [ ] `/contact` enquiry submits
- [ ] `/apply` application submits
- [ ] `/complaints` complaint submits
- [ ] `/legal/terms`, `/privacy`, `/cmp` load; CMP PDF uploaded to `public/documents/ukala-cmp-certificate.pdf` (or URL updated in `site.ts`)

### StaffAdmin

- [ ] First staff can sign in to `/admin`
- [ ] Invite a second staff member from Settings; they accept and reach `/admin`
- [ ] Create/edit a property with images; portal sync status updates when portals are enabled
- [ ] Create landlord + renter + tenancy; send portal invites
- [ ] Enquiries: change pipeline; book a viewing with the date picker; viewing appears in Scheduled viewings
- [ ] Applications: referencing + convert to tenancy
- [ ] Finance: open invoice visible; mark paid; arrears / statements / payouts reachable
- [ ] Compliance: refresh statuses; open task appears under **Tasks**; deposit/notice lifecycle usable
- [ ] Tickets: create ticket, assign contractor → contractor receives email (or log when Resend unset)
- [ ] Jobs board and complaints list load

### Tenant

- [ ] Accept renter invite → `/portal`
- [ ] Rent invoice listed; Stripe checkout starts when Connect is complete
- [ ] Create a maintenance ticket

### Landlord

- [ ] Accept landlord invite → `/landlord-portal` (no paste of auth user id)
- [ ] Statements and compliance views load for their properties

### Integrations dry-run

- [ ] Stripe Connect onboarding complete in Settings
- [ ] Resend inbound MX + webhook delivers a test mail into tickets
- [ ] Outbound invite email received (or clipboard fallback documented for the agency)
- [ ] Trigger `/api/cron/rent` with `Authorization: Bearer $CRON_SECRET` in staging (or wait for schedule)
- [ ] Rightmove/OTM test connection from Admin → Portal sync (if licensed)

### Rebrand smoke

- [ ] Agency name appears as hero-level brand on the homepage (not only in nav)
- [ ] Phone, email, address, fees match the client
- [ ] Favicon / logo replaced under `public/`

## Operational notes

- **Complaints** (formal SLA) and **tickets** (maintenance) are separate — do not merge.
- **Landlord statements**: Admin → Finance → Statements / payouts.
- Monthly rent invoices are generated by cron; staff can also mark invoices paid manually.
- One deploy = one agency. Clone again for the next client.
