import type { Metadata } from "next";
import { getTenant } from "@repo/config";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  const { name, domain } = getTenant();
  const siteHost = domain.replace(/^https?:\/\//, "");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <h1>Terms and Conditions</h1>
      <p>
        These terms govern your use of the {name} website operated at {siteHost}.
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
        Content on this website is owned by {name} or used with permission. You may not reproduce
        material without consent.
      </p>

      <h2>Liability</h2>
      <p>
        We are not liable for indirect or consequential loss arising from use of this website,
        except where prohibited by law.
      </p>
    </div>
  );
}
