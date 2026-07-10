# Let Flow Integration Notes

**Source repo:** https://github.com/microstargg/let-flow (private)

## Features ported into rent-or-let

| Let Flow feature | Implementation |
|-----------------|----------------|
| Tenant application forms | Multi-step form at `/apply` → `tenant_applications` table → admin review |
| Email sync | Resend inbound webhook at `/api/webhooks/inbound-email` → enquiries, complaints, or maintenance tickets |
| Complaints | Form at `/complaints` + email routing → `complaints` table with SLA tracking |
| Landlords | `/admin/landlords` + `landlords` table |
| Renters | `/admin/renters` + `renters` table + portal invites |
| Tenancies | `/admin/tenancies` + `tenancies` table |
| Invoices / payments | `/admin/finance/invoices` + cron `/api/cron/rent` |
| Landlord statements | `/admin/finance/statements` → CSV export |
| Maintenance tickets | `/admin/tickets` + jobs board |
| Renter portal | `/portal/*` with rent pay + tickets |
| Stripe Connect | `/admin/settings` + `/api/webhooks/stripe` |

## Unified admin dashboard

Admin sidebar includes properties, people (landlords, renters, tenancies), finance, enquiries, applications, complaints, tickets, portal sync, and settings.

## Email routing logic

Inbound emails to the configured address are routed:

- `maintenance+{token}@domain` → maintenance **ticket** (if sender matches a renter with active tenancy)
- Subject or recipient contains "complaint" → `complaints` table
- All other emails → `enquiries` table

## New client deployments

See [client-setup.md](client-setup.md) for the fork → rebrand → Neon → deploy workflow.
