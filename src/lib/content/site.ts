export const siteContent = {
  hero: {
    subtitle:
      "Family-owned letting agents operating from Middlesbrough. We are landlords ourselves and understand what is required.",
  },
  about: {
    summary:
      "Property Management Services are letting agents operating in the Teesside area. The business is family owned and run from our office in Middlesbrough. We are big enough to cope and small enough to care — with over 40 years of experience in residential and commercial property management.",
  },
  contact: {
    phone: "01642 217 224",
    fax: "01642 232 499",
    address: {
      line1: "Property Management Services",
      line2: "11 Kings Road, North Ormesby",
      city: "Middlesbrough",
      postcode: "TS3 6NG",
    },
    hours: [
      { day: "Monday", hours: "10:00 – 17:00" },
      { day: "Tuesday", hours: "10:00 – 17:00" },
      { day: "Wednesday", hours: "10:00 – 17:00" },
      { day: "Thursday", hours: "10:00 – 17:00" },
      { day: "Friday", hours: "10:00 – 17:00" },
    ],
  },
  cmp: {
    scheme: "UKALA Client Protection Scheme",
    certificateUrl: "/documents/ukala-cmp-certificate.pdf",
  },
  fees: {
    holdingDepositNote:
      "Holding deposit (max one week's rent) may be taken to reserve a property.",
    tenancyDepositNote:
      "Tenancy deposit capped at five weeks' rent where annual rent is under £50,000.",
    permittedPaymentsUrl:
      "https://www.gov.uk/government/publications/how-to-rent/how-to-rent-the-checklist-for-renting-in-england",
  },
} as const;
