import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Contact us",
};

export default function ContactPage() {
  const { address, phone, fax, hours } = siteContent.contact;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold">Contact us</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Get in touch</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium">Address</dt>
              <dd className="text-muted-foreground">
                {address.line1}
                <br />
                {address.line2}
                <br />
                {address.city}, {address.postcode}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Telephone</dt>
              <dd>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-primary">
                  {phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium">Facsimile</dt>
              <dd className="text-muted-foreground">{fax}</dd>
            </div>
          </dl>
          <h2 className="mt-8 text-lg font-semibold">Office hours</h2>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {hours.map(({ day, hours: h }) => (
              <li key={day}>
                {day}: {h}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Send a message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
