import type { Metadata } from "next";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy Notice",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <h1>Privacy Notice</h1>
      <p className="lead">
        Property Management Services (&quot;we&quot;, &quot;us&quot;) is committed to protecting
        your personal data in accordance with UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>Who we are</h2>
      <p>
        {siteContent.contact.address.line1}, {siteContent.contact.address.line2},{" "}
        {siteContent.contact.address.city}, {siteContent.contact.address.postcode}.
        Telephone: {siteContent.contact.phone}.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>Contact details (name, email, phone) when you enquire or apply</li>
        <li>Property preferences and application information</li>
        <li>Technical data (IP address, browser type) via essential cookies</li>
        <li>Analytics data only with your explicit consent</li>
      </ul>

      <h2>Lawful basis</h2>
      <ul>
        <li>Contract — processing tenancy applications and enquiries</li>
        <li>Legitimate interests — responding to complaints and maintaining our website</li>
        <li>Consent — non-essential cookies and marketing communications</li>
        <li>Legal obligation — compliance with letting regulations</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, or object to processing of your
        personal data, and to data portability. Contact us at{" "}
        <a href="mailto:info@rent-or-let.co.uk">info@rent-or-let.co.uk</a> to exercise these
        rights. You may also complain to the Information Commissioner&apos;s Office (ICO).
      </p>

      <h2>Data retention</h2>
      <p>
        Enquiry data is retained for 12 months. Tenancy application data is retained for 6 years
        after the end of a tenancy or rejection, in line with legal requirements.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for site functionality. Non-essential cookies are only set after
        you provide consent via our cookie banner. You can withdraw consent at any time using the
        cookie settings link.
      </p>

      <p className="text-sm text-muted-foreground">
        Last updated: June 2025. This notice should be reviewed by a solicitor before go-live.
      </p>
    </div>
  );
}
