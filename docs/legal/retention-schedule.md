# Suggested retention schedule for agencies

**DRAFT. Each agency decides its own periods as controller; these are common defaults for UK
letting agents. Confirm with a solicitor.**

These periods match the agency privacy notice template at `apps/site/src/app/legal/privacy`.
If an agency changes them, update its notice too.

| Record | Table(s) | Keep for | Then | Reason |
| --- | --- | --- | --- | --- |
| Enquiries that do not lead to an application | `enquiries` | 12 months from last contact | Delete | No ongoing need |
| Unsuccessful applications | `tenant_applications` (incl. `reference_data`) | 6 months after the decision | Delete | Long enough to answer a discrimination or fairness complaint |
| Successful applications | `tenant_applications` | Life of the tenancy + 6 years | Delete | Part of the tenancy record |
| Right to Rent evidence (check results, document copies) | `renter_documents` (kind `right_to_rent`) | 1 year after the renter's last tenancy ends | Delete | Home Office guidance |
| Renter ID, references, guarantor and income documents | `renter_documents` | End of the renter's last tenancy + 6 years; 6 months from upload if they never took a tenancy | Delete | Limitation Act; fairness complaints for unsuccessful applicants |
| Tenancy records, rent, invoices, payments, deposits | `tenancies`, `invoices`, `payments`, `ledger_entries`, `payment_allocations` | End of tenancy + 6 years | Delete or anonymise | Limitation Act 1980; HMRC |
| Maintenance tickets, messages, work orders, inspections | `tickets`, `ticket_messages`, `work_orders`, `inspections` | End of tenancy + 6 years | Delete | Disrepair claims |
| Gas, electrical and other safety certificates | `compliance_items`, `documents` | At least 2 years for gas (legal minimum); keep 6 years | Delete | Gas Safety Regulations 1998 |
| Landlord records, statements and payouts | `landlords`, `landlord_statements`, `landlord_payouts` | End of agreement + 6 years | Delete | Limitation Act; HMRC |
| Anti-money laundering checks on landlords | `documents` | 5 years after the relationship ends | Delete | Money Laundering Regulations 2017 |
| Complaints | `complaints` | 6 years after closure | Delete | Redress scheme and claims |
| Bank feed transactions | `bank_transactions` | 6 years | Delete | Accounting records |
| Cookie consent records | `cookie_consents` | 2 years | Delete | Evidence of consent; holds no identifier beyond a random ID |
| Staff accounts | `staff_profiles` | While employed + 6 months | Delete | Access no longer needed |

## Automatic deletion

`/api/cron/retention` runs weekly (Sunday 04:00 UTC) and covers five rules so far: enquiries
older than 12 months, rejected applications older than 6 months, complaints resolved more than
6 years ago, cookie consent records older than 2 years, and renter documents (the periods
above, counted from the end of the renter's last tenancy). Periods live in
`apps/web/src/lib/db/queries/retention.ts` and `RENTER_DOCUMENT_RETENTION` in
`apps/web/src/lib/db/queries/renter-documents.ts`.

Renter documents are stored privately (`apps/web/src/lib/storage/private-files.ts`): in a
private Vercel Blob store when `PRIVATE_BLOB_READ_WRITE_TOKEN` is set, otherwise in the
agency database. They are never given a public URL.

It only counts rows by default. It deletes for an agency only when that agency's slug is in the
`RETENTION_ENFORCE_AGENCIES` environment variable (comma separated, e.g. `pms,veri-properties`),
because deletion cannot be undone. Check the dry-run counts in the cron response before adding
an agency.

The six-year rules for tenancy, finance, maintenance and landlord records are not automated
yet, because a tenancy's end date has to drive them.
