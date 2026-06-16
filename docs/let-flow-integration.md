# Let Flow Integration Notes

**Source repo:** https://github.com/microstargg/let-flow (private)

## Features ported into rent-or-let

| Let Flow feature | Implementation |
|-----------------|----------------|
| Tenant application forms | Multi-step form at `/apply` → `tenant_applications` table → admin review |
| Email sync | Resend inbound webhook at `/api/webhooks/inbound-email` → enquiries or complaints inbox |
| Complaints | Form at `/complaints` + email routing → `complaints` table with SLA tracking |

## Unified admin dashboard

Admin sidebar tabs:
- Properties (CRUD + portal sync)
- Enquiries (website + email)
- Applications (tenant forms)
- Complaints (website + email, SLA dates)
- Portal sync (RTDF status + logs)

## Email routing logic

Inbound emails to the configured address are routed:
- Subject or recipient contains "complaint" → `complaints` table
- All other emails → `enquiries` table

Configure Resend inbound domain and point webhook to:
`https://your-domain.co.uk/api/webhooks/inbound-email`

## Next steps after Let Flow repo access

1. Clone `microstargg/let-flow` and compare form fields/schemas
2. Port any additional validation rules or reference-check workflows
3. Migrate any existing tenant/application data if needed
