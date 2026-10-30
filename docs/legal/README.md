# Legal and data protection drafts

**Status: DRAFT. Not legal advice. Have a UK solicitor review every document here before it is
signed, published or relied on.**

Let Flow hosts personal data for letting agencies: applicants, tenants, landlords, contractors
and staff. Under UK GDPR each agency is the **controller** of that data and Let Flow is its
**processor**. UK GDPR Article 28 says a controller may only use a processor under a written
contract with specific terms, so every agency on the platform needs a signed agreement that
includes a data processing agreement before live data goes in.

| Document | Who it is for | Where it goes |
| --- | --- | --- |
| [customer-terms.md](customer-terms.md) | Agencies that subscribe to Let Flow | Signed at onboarding, linked from letflow.app |
| [data-processing-agreement.md](data-processing-agreement.md) | Agencies (controller) and Let Flow (processor) | Schedule to the customer terms, signed together |
| [sub-processors.md](sub-processors.md) | Agencies, to see who Let Flow uses | Annex 3 of the DPA, and a public page on letflow.app |
| [letflow-privacy-notice.md](letflow-privacy-notice.md) | Visitors to letflow.app and agency staff who hold accounts | `/legal/privacy` on letflow.app |
| [retention-schedule.md](retention-schedule.md) | Agencies, and the platform's future retention job | Shared with agencies at onboarding |

Each agency site already has a privacy notice at `/legal/privacy` (apps/site) built from the
agency's own details in `tenants/<slug>/site.ts`. Fill in `site.legal` (company number, ICO
registration number, privacy inbox) for each agency so it appears on the notice.

## Placeholders

Text in `[square brackets]` must be filled in, for example `[Let Flow legal entity]`,
`[company number]` and `[ICO registration number]`.
