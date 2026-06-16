import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <h1>Terms and Conditions</h1>
      <p>
        These terms govern your use of the Property Management Services website operated at
        rent-or-let.co.uk.
      </p>

      <h2>Use of this website</h2>
      <p>
        Property listings are provided for information purposes. While we endeavour to keep
        information accurate and up to date, details may change. Please contact us to confirm
        availability before making decisions.
      </p>

      <h2>Enquiries and applications</h2>
      <p>
        Submitting an enquiry or tenant application does not create a contractual relationship.
        All tenancies are subject to referencing, affordability checks, and signed agreement.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Content on this website including text, images, and branding is owned by Property
        Management Services unless otherwise stated.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        We are not liable for any loss arising from reliance on information on this website or
        temporary unavailability of the site.
      </p>

      <p className="text-sm text-muted-foreground">
        Last updated: June 2025. Solicitor review recommended before go-live.
      </p>
    </div>
  );
}
