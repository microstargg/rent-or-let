import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHero } from "@/components/marketing/page-hero";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Contact Property Management Services in Middlesbrough. Call 01642 217 224 or visit us at 11 Kings Road, North Ormesby.",
};

export default function ContactPage() {
  const { address, phone, fax, email, hours } = siteContent.contact;

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We would love to hear from you"
        subtitle="Visit our lettings office on Kings Road, call us during office hours, or send a message using the form below."
      />

      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Phone className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">Telephone</h2>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="mt-1 block text-primary hover:underline"
                >
                  {phone}
                </a>
                <p className="mt-2 text-xs text-muted-foreground">
                  Facsimile: {fax}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Mail className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">Email</h2>
                <a
                  href={`mailto:${email}`}
                  className="mt-1 block text-primary hover:underline"
                >
                  {email}
                </a>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <MapPin className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Find us</h2>
              <address className="mt-2 text-sm text-muted-foreground not-italic leading-relaxed">
                {address.line1}
                <br />
                {address.line2}
                <br />
                {address.city}, {address.postcode}
              </address>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Clock className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Office hours</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lettings sales office: Monday to Friday
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {hours.map(({ day, hours: h }) => (
                  <li key={day} className="flex justify-between gap-4">
                    <span>{day}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Send a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We will respond as soon as possible during office hours.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
