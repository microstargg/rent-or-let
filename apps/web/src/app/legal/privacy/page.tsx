import type { Metadata } from "next";
import Link from "next/link";
import { bindRequestAgency } from "@/lib/agency";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
};

const LAST_UPDATED = "30 October 2026";

export default async function PortalPrivacyPage() {
  const agency = await bindRequestAgency();
  const { name, domain, site } = agency.config;
  const privacyEmail = site.legal?.privacyEmail ?? site.contact.email;
  const legalName = site.legal?.companyName ?? name;
  const publicSite = domain.startsWith("http") ? domain : `https://${domain}`;

  return (
    <LegalPage>
      <h1>Privacy Notice</h1>
      <p>Last updated {LAST_UPDATED}.</p>
      <p>
        This notice covers the {name} portal and office system, used by our staff, tenants,
        landlords and contractors. {legalName} is the controller of the personal data held here.
        {site.legal?.icoRegistrationNumber
          ? ` We are registered with the Information Commissioner's Office under number ${site.legal.icoRegistrationNumber}.`
          : null}
      </p>
      <p>
        Our full privacy notice, including what we collect, why, our lawful basis, who we share it
        with and how long we keep it, is on our website at{" "}
        <a href={`${publicSite}/legal/privacy`}>{publicSite.replace(/^https?:\/\//, "")}/legal/privacy</a>.
      </p>

      <h2>Who runs this system</h2>
      <p>
        The portal runs on LetFlow, property management software that {name} uses. LetFlow
        processes data only on our instructions, under a written data processing agreement, and
        uses its own approved providers for hosting, databases, file storage and email.
      </p>

      <h2>What the portal holds</h2>
      <ul>
        <li>Your name, email, phone number and login details</li>
        <li>Tenancy, rent, payment and deposit records</li>
        <li>Maintenance requests, messages, photos and inspection reports</li>
        <li>Landlord statements, payouts and property compliance certificates</li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>
        The portal uses only strictly necessary cookies: a session cookie to keep you signed in,
        and browser storage to remember your cookie choice. On our demo system, a cookie also records that
        you entered the access code. We do not use advertising or tracking cookies.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, ask us to correct or delete it, or object to how we
        use it. Email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. We will reply within
        one month. You can also complain to the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">
          ico.org.uk
        </a>
        .
      </p>

      <p>
        <Link href="/login">Back to sign in</Link>
      </p>
    </LegalPage>
  );
}
