# Let Flow sub-processors

**DRAFT. Let Flow must confirm each provider's data region, sign or accept each provider's DPA,
and record the transfer safeguard before publishing this list.**

Built from the services the code uses (`apps/web`, `apps/site`, environment variables) as of
30 October 2026.

| Provider | What it does for Let Flow | Data involved | Location | Safeguard to confirm |
| --- | --- | --- | --- | --- |
| Vercel Inc. | Hosts the platform, agency sites and letflow.app; Vercel Blob file storage; request logs | All Customer Personal Data in transit; uploaded files (certificates, inspection photos, ticket attachments) | USA, with edge locations worldwide. Function region: [confirm, ideally London `lhr1`] | Vercel DPA; UK Extension to DPF or IDTA |
| Neon Inc. (Databricks) | Postgres database and Neon Auth sign-in | All structured Customer Personal Data; login accounts | [Confirm region of projects `rent-or-let` and `letflow-demo`, ideally AWS London `eu-west-2`] | Neon DPA; IDTA or DPF Extension if data leaves the UK |
| Resend Inc. | Sends and receives email (invites, notifications, inbound ticket email) | Names, email addresses, email content | USA | Resend DPA; DPF Extension or IDTA |
| Google LLC | Gemini AI for listing copy and maintenance ticket replies | Property details; ticket text and messages, which can include tenant names and personal details | USA / global | **Paid Gemini API terms only** (see note), Google Cloud DPA |
| Stripe Payments UK Ltd / Stripe Inc. | Card and payment processing | Payer name, email, payment details | UK / USA | Stripe DPA; DPF Extension |
| Rightmove, OnTheMarket | Property listing feeds (only when the agency enables them) | Property details; agent contact details | UK | These act for the agency, not for Let Flow. The agency's own contract with each portal applies |
| Ministry of Housing EPC register | Looks up energy certificates | Property addresses | UK | Public data; no personal data beyond address |

## Notes

- **Google AI.** The code defaults to a free Google AI Studio key. Under Google's Gemini API terms,
  prompts sent through unpaid services may be used to improve Google's products and reviewed by
  people, and Google requires paid services when serving users in the UK and EEA. Ticket text
  contains tenant personal data, so AI features must run on a paid Gemini API account (or
  through Vercel AI Gateway on terms that exclude training) before any live agency uses them.
- **Vercel Analytics** on letflow.app collects anonymous page view data without cookies. It does
  not touch Customer Personal Data.
- Keep this page in step with the code. Adding a new service that receives personal data means
  updating this list and giving agencies 30 days' notice under DPA clause 4.2.
