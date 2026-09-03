import type { Metadata } from "next";
import Link from "next/link";
import { getTenant } from "@repo/config";

export const metadata: Metadata = {
  title: "Privacy Notice",
};

export default function PrivacyPage() {
  const { site: siteContent, name } = getTenant();
  const { contact } = siteContent;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <h1>Privacy Notice</h1>
      <p className="lead">
        {name} (&quot;we&quot;, &quot;us&quot;) is committed to protecting your personal data in
        accordance with UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>Who we are</h2>
      <p>
        {contact.address.line1}, {contact.address.line2}, {contact.address.city},{" "}
        {contact.address.postcode}. Telephone: {contact.phone}.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>Contact details (name, email, phone) when you enquire or apply</li>
        <li>Property preferences and application information</li>
        <li>Technical data (IP address, browser type) via essential cookies</li>
        <li>Analytics data only with your explicit consent</li>
      </ul>

      <h2>How we use your data</h2>
      <p>
        We process personal data to respond to enquiries, manage tenancies, comply with legal
        obligations, and improve our services. We do not sell your data.
      </p>

      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict processing, and object to processing.
        Contact us at{" "}
        <a href={`mailto:${contact.email}`}>{contact.email}</a> to exercise these rights.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for site functionality. Analytics cookies are only set with your
        consent via our cookie banner.
      </p>

      <p>
        <Link href="/">Return to homepage</Link>
      </p>
    </div>
  );
}
