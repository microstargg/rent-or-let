import type { Metadata } from "next";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
};

const LAST_UPDATED = "30 October 2026";

export default async function PrivacyPage() {
  const { site: siteContent, name, id } = await getTenant();
  const { contact, legal } = siteContent;
  const isVeri = isVeriAgency(id);
  const privacyEmail = legal?.privacyEmail ?? contact.email;
  const legalName = legal?.companyName ?? name;
  const address = contact.address
    ? [contact.address.line1, contact.address.line2, contact.address.city, contact.address.postcode]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <LegalPage className={isVeri ? "pt-28 md:pt-32" : undefined}>
      <h1>Privacy Notice</h1>
      <p>Last updated {LAST_UPDATED}.</p>
      <p>
        This notice explains how {name} (&quot;we&quot;, &quot;us&quot;) collects and uses personal
        data about people who use this website, enquire about or apply for a property, rent a home
        we manage, or let a property through us. We follow UK GDPR and the Data Protection Act
        2018.
      </p>

      <h2>Who we are</h2>
      <p>
        {legalName} is the controller of your personal data.
        {address ? ` Our address is ${address}.` : ` ${name} is a UK letting agency.`}
        {legal?.companyNumber ? ` Company number ${legal.companyNumber}.` : null}
        {legal?.icoRegistrationNumber
          ? ` We are registered with the Information Commissioner's Office under number ${legal.icoRegistrationNumber}.`
          : null}
      </p>
      <p>
        For anything about your data, email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
        {contact.phone ? ` or call ${contact.phone}` : null}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Enquiries and viewings:</strong> your name, email, phone number, the property you
          are interested in and your message.
        </li>
        <li>
          <strong>Tenant applications:</strong> contact details, current address, employment
          status and income, move-in date, who will live with you, pets, and details needed for
          referencing and Right to Rent checks.
        </li>
        <li>
          <strong>Tenancies:</strong> tenancy agreements, rent and payment records, deposit
          details, maintenance requests and messages, inspection reports and photos, and notices.
        </li>
        <li>
          <strong>Landlords:</strong> contact and bank details, property details, ownership and
          identity checks, safety certificates, and statements.
        </li>
        <li>
          <strong>Complaints:</strong> your name, email and the details of your complaint.
        </li>
        <li>
          <strong>Website use:</strong> technical data such as IP address and browser type, which
          our hosting provider records to keep the site secure.
        </li>
      </ul>
      <p>
        Please do not send us health or other sensitive information unless it is needed, for
        example to arrange a repair or an adaptation. If you do, we will use it only for that
        purpose.
      </p>

      <h2>Why we use it and our lawful basis</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Lawful basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Replying to enquiries and arranging viewings</td>
            <td>Taking steps at your request before a contract; our legitimate interests</td>
          </tr>
          <tr>
            <td>Assessing applications, referencing and affordability</td>
            <td>Taking steps at your request before a contract</td>
          </tr>
          <tr>
            <td>Right to Rent, anti-money laundering and identity checks</td>
            <td>Legal obligation</td>
          </tr>
          <tr>
            <td>Managing tenancies, rent, deposits, repairs and safety checks</td>
            <td>Contract; legal obligation</td>
          </tr>
          <tr>
            <td>Handling complaints and redress scheme referrals</td>
            <td>Legal obligation; our legitimate interests</td>
          </tr>
          <tr>
            <td>Keeping records and defending legal claims</td>
            <td>Legal obligation; our legitimate interests</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use your data for marketing unless you ask us to, and we do not sell it. We do not
        make decisions about you by automated means alone. Our team may use software tools,
        including AI-assisted drafting, but a person reviews the result.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>The landlord of the property you rent or apply for</li>
        <li>Referencing and credit reference agencies, and your referees</li>
        <li>Tenancy deposit protection schemes</li>
        <li>Contractors who carry out repairs, safety checks and inspections</li>
        <li>Local authorities, utility suppliers and council tax offices where the law requires it</li>
        <li>Our redress and client money protection schemes</li>
        <li>HMRC, the police or other authorities where we are legally required to</li>
        <li>
          Service providers who run systems for us, such as our property management software
          (LetFlow), website hosting, email delivery and payment processing. They only act on our
          instructions.
        </li>
      </ul>

      <h2>International transfers</h2>
      <p>
        Some of our service providers store or process data outside the UK, including in the
        European Economic Area and the United States. Where they do, we rely on UK adequacy
        regulations or on safeguards approved under UK law, such as the International Data
        Transfer Agreement or the UK Extension to the EU-US Data Privacy Framework.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Enquiries that do not lead to an application: up to 12 months</li>
        <li>Unsuccessful applications: up to 6 months after our decision</li>
        <li>Right to Rent check records: for the tenancy and one year after it ends</li>
        <li>
          Tenancy, landlord and financial records: six years after the tenancy or our agreement
          ends, which is how long legal claims can be brought
        </li>
        <li>Complaints: six years after they are closed</li>
      </ul>
      <p>We delete or anonymise data when we no longer need it.</p>

      <h2>Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>ask for a copy of your personal data</li>
        <li>ask us to correct data that is wrong or incomplete</li>
        <li>ask us to delete your data, where we do not need to keep it</li>
        <li>ask us to restrict or stop using your data, or object to how we use it</li>
        <li>ask us to send your data to another organisation, where this applies</li>
      </ul>
      <p>
        Email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> to make a request. We will
        reply within one month. There is usually no charge.
      </p>
      <p>
        If you are unhappy with how we have handled your data, please tell us first. You can also
        complain to the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">
          ico.org.uk
        </a>{" "}
        or on 0303 123 1113.
      </p>

      <h2>Cookies</h2>
      <p>
        This site uses only the cookies and browser storage it needs to work, such as remembering
        your cookie choice. We do not use advertising or tracking cookies. If we add analytics in
        future, we will only use it after you agree through the cookie banner, and you can change
        your choice at any time using the &quot;Cookie settings&quot; button.
      </p>

      <h2>Changes to this notice</h2>
      <p>We will update this page if how we use your data changes.</p>

      <p>
        <Link href="/">Return to homepage</Link>
      </p>
    </LegalPage>
  );
}
