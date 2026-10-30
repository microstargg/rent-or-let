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
| Right to Rent checks | `documents` | Tenancy + 1 year | Delete | Home Office guidance |
| Tenancy records, rent, invoices, payments, deposits | `tenancies`, `invoices`, `payments`, `ledger_entries`, `payment_allocations` | End of tenancy + 6 years | Delete or anonymise | Limitation Act 1980; HMRC |
| Maintenance tickets, messages, work orders, inspections | `tickets`, `ticket_messages`, `work_orders`, `inspections` | End of tenancy + 6 years | Delete | Disrepair claims |
| Gas, electrical and other safety certificates | `compliance_items`, `documents` | At least 2 years for gas (legal minimum); keep 6 years | Delete | Gas Safety Regulations 1998 |
| Landlord records, statements and payouts | `landlords`, `landlord_statements`, `landlord_payouts` | End of agreement + 6 years | Delete | Limitation Act; HMRC |
| Anti-money laundering checks on landlords | `documents` | 5 years after the relationship ends | Delete | Money Laundering Regulations 2017 |
| Complaints | `complaints` | 6 years after closure | Delete | Redress scheme and claims |
| Bank feed transactions | `bank_transactions` | 6 years | Delete | Accounting records |
| Cookie consent records | `cookie_consents` | 2 years | Delete | Evidence of consent; holds no identifier beyond a random ID |
| Staff accounts | `staff_profiles` | While employed + 6 months | Delete | Access no longer needed |

## Platform work needed

The platform does not delete anything automatically yet. A retention job (a cron route like the
existing ones in `apps/web/src/app/api/cron`) should delete or anonymise rows past these periods
for each agency database. It must be off by default and switched on per agency once that agency
has agreed its periods, because deletion cannot be undone.
