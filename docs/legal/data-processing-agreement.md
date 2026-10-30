# Data Processing Agreement

**DRAFT for solicitor review. Not legal advice.**

This Data Processing Agreement ("DPA") forms part of the Let Flow Customer Terms (the
"Agreement") between:

- **[Agency legal name]**, company number [number], of [address] (the "Customer"); and
- **[Let Flow legal entity]**, company number [number], of [address] ("Let Flow").

It applies whenever Let Flow processes Customer Personal Data in providing the Services.

## 1. Definitions

1.1 **Data Protection Laws** means the UK GDPR, the Data Protection Act 2018, the Privacy and
Electronic Communications Regulations 2003 and any law that replaces or supplements them, as
amended (including by the Data (Use and Access) Act 2025).

1.2 **Controller**, **Processor**, **Data Subject**, **Personal Data**, **Personal Data Breach**,
**Processing** and **Supervisory Authority** have the meanings given in the UK GDPR.

1.3 **Customer Personal Data** means Personal Data that the Customer, its staff, landlords,
applicants, tenants or contractors enter into, upload to or generate in the Services, including
data submitted through the Customer's agency website.

1.4 **Sub-processor** means a third party Let Flow engages to process Customer Personal Data.

1.5 **Services** means the Let Flow platform, agency websites, tenant and landlord portals and
related support described in the Agreement.

## 2. Roles

2.1 The Customer is the Controller and Let Flow is the Processor of Customer Personal Data.

2.2 The Customer is responsible for having a lawful basis for the Processing, giving privacy
information to Data Subjects, the accuracy of the data it enters, and its own compliance with
Data Protection Laws, including paying the ICO data protection fee.

2.3 Let Flow is a Controller only of the account and billing data it needs to run its
relationship with the Customer, which its own privacy notice covers.

## 3. Let Flow's obligations

Let Flow will:

3.1 process Customer Personal Data only on the Customer's documented instructions, which are the
Agreement, this DPA and the Customer's use of the Services' features, unless UK law requires
otherwise, in which case Let Flow will tell the Customer first unless the law forbids it;

3.2 tell the Customer promptly if it believes an instruction breaks Data Protection Laws;

3.3 make sure everyone authorised to process Customer Personal Data is bound by confidentiality;

3.4 apply the technical and organisational measures in Annex 2;

3.5 assist the Customer, taking into account the nature of the Processing, in responding to Data
Subject requests (access, rectification, erasure, restriction, portability and objection), and
pass to the Customer without undue delay any request it receives directly;

3.6 assist the Customer with security, breach notification, data protection impact assessments
and prior consultation with the ICO, so far as they relate to the Services;

3.7 notify the Customer without undue delay, and in any event within **48 hours**, after becoming
aware of a Personal Data Breach affecting Customer Personal Data, with the information the
Customer reasonably needs to meet its own obligation to report to the ICO within 72 hours;

3.8 make available the information reasonably needed to show compliance with Article 28 UK GDPR
and allow audits under clause 7; and

3.9 not sell Customer Personal Data, and not use it to train AI models or for its own purposes,
except to provide, secure and support the Services and to produce aggregated statistics that do
not identify any person or the Customer.

## 4. Sub-processors

4.1 The Customer gives general authorisation for Let Flow to use the Sub-processors listed in
Annex 3.

4.2 Let Flow will give the Customer at least **30 days'** notice by email before adding or
replacing a Sub-processor. The Customer may object on reasonable data protection grounds within
that period. If the parties cannot resolve the objection, the Customer may end the affected
Services and receive a pro-rata refund of prepaid fees.

4.3 Let Flow will put a written contract in place with each Sub-processor imposing data
protection obligations no less protective than this DPA, and remains liable to the Customer for
each Sub-processor's performance.

## 5. International transfers

5.1 Let Flow will not transfer Customer Personal Data outside the UK unless the transfer is to a
country covered by UK adequacy regulations, or is protected by an appropriate safeguard under
Article 46 UK GDPR, such as the ICO's International Data Transfer Agreement or Addendum, or the
UK Extension to the EU-US Data Privacy Framework where the recipient is certified.

5.2 Annex 3 shows where each Sub-processor processes data and which safeguard applies.

## 6. Return and deletion

6.1 During the Agreement the Customer can export its data using the Services' export tools or
by asking Let Flow for an export in a common machine-readable format.

6.2 Within **30 days** after the Agreement ends, Let Flow will, at the Customer's choice, return
Customer Personal Data and then delete it, or delete it. Copies in backups will be deleted on
the normal backup cycle, within **[35] days**, and kept secure until then. Let Flow may keep
data where UK law requires it, and will protect it under this DPA for as long as it does.

## 7. Audits

7.1 Let Flow will answer the Customer's reasonable written security questionnaires and provide
summaries of relevant Sub-processor certifications (such as SOC 2 or ISO 27001 reports).

7.2 Where that information is not enough to show compliance, or the ICO requires it, the
Customer may carry out an audit on at least 30 days' notice, no more than once a year, during
business hours, at its own cost, and subject to confidentiality.

## 8. Liability

Each party's liability under this DPA is subject to the limits in the Agreement, except that
nothing limits liability that cannot be limited by law. *[Solicitor to confirm whether data
protection liability should have a separate, higher cap.]*

## 9. Order of precedence

If this DPA conflicts with the Agreement, this DPA wins in relation to Customer Personal Data.

---

## Annex 1: Details of processing

| Item | Details |
| --- | --- |
| Subject matter | Providing property management software, agency websites and portals |
| Duration | The term of the Agreement plus the return and deletion period in clause 6 |
| Nature and purpose | Hosting, storing, organising, displaying, transmitting, backing up and deleting data so the Customer can market properties, handle enquiries and applications, manage tenancies, rent, deposits, maintenance, inspections, compliance, complaints and landlord accounts |
| Data subjects | Enquirers and applicants; tenants and occupants; guarantors and referees; landlords; contractors; the Customer's staff; complainants |
| Categories of data | Identity and contact details; addresses; employment and income; application and referencing information; tenancy, rent, deposit and payment records; bank transaction data; landlord bank details; maintenance messages, photos and inspection reports; property compliance certificates; complaints; login and usage records |
| Special category data | Not intended. Data about health or disability may appear in free text (for example a repair request about an adaptation). The Customer should only enter it where needed |
| Criminal offence data | Not intended to be processed |

## Annex 2: Technical and organisational measures

*Let Flow to confirm each item is true before signing.*

- Hosting on Vercel and Neon, which hold SOC 2 Type II reports; all traffic over HTTPS with HSTS
- Data encrypted at rest by the hosting and database providers
- Each agency's data separated by agency in the database, with separate databases where an
  agency requires it
- Staff, landlord and tenant access controlled by role; access to the office system needs a
  staff profile approved by an agency admin
- Secrets held in server-side environment variables, never in the browser
- Uploaded files stored under unguessable names
- Security headers including X-Frame-Options, X-Content-Type-Options and Permissions-Policy
- Point-in-time database backups held by Neon
- Access to production limited to named Let Flow personnel with multi-factor authentication
- Breach response procedure with Customer notification within 48 hours
- Dependencies kept up to date and reviewed for known vulnerabilities

## Annex 3: Sub-processors

See [sub-processors.md](sub-processors.md), which forms part of this Annex.
