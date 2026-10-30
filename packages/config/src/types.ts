export interface SiteContent {
  hero: {
    subtitle: string;
  };
  /** Where the agency lets homes, e.g. "Middlesbrough and Teesside". Omit for UK-wide / remote. */
  region?: string;
  /** Homepage copy for the standard layout. Omit to use neutral defaults + about.highlights. */
  home?: {
    eyebrow: string;
    title: string;
    trustPoints: Array<{ title: string; description: string }>;
    landlordsBlurb: string;
    tenantsBlurb: string;
  };
  about: {
    summary: string;
    paragraphs: string[];
    highlights: Array<{ title: string; description: string }>;
    /** Sidebar + "why choose us" copy on /about. Omit to use neutral defaults. */
    sidebar?: string;
    whyChoose?: string;
    /** Three pillars on /about. Omit to use the first three highlights. */
    pillars?: Array<{ title: string; description: string }>;
  };
  contact: {
    /** Omit for remote / email-only agencies */
    phone?: string;
    fax?: string;
    email: string;
    /** Omit when the agency has no public registered / office address */
    address?: {
      line1: string;
      line2: string;
      city: string;
      postcode: string;
    };
    /** Omit when remote-only (no public office hours) */
    hours?: Array<{ day: string; hours: string }>;
  };
  cmp: {
    scheme: string;
    certificateUrl: string;
  };
  /** Data protection details shown on the privacy notice. Each field is optional. */
  legal?: {
    /** Registered company name, if different from the trading name. */
    companyName?: string;
    companyNumber?: string;
    /** ICO data protection fee registration number, e.g. "ZA123456". */
    icoRegistrationNumber?: string;
    /** Inbox for privacy requests. Defaults to contact.email. */
    privacyEmail?: string;
  };
  memberships: string[];
  deposits: {
    note: string;
  };
  fees: {
    holdingDepositNote: string;
    tenancyDepositNote: string;
    permittedPaymentsUrl: string;
  };
  landlords: {
    hero: { eyebrow: string; title: string; subtitle: string };
    intro: string[];
    services: string[];
    contractors: string;
    fees: {
      summary: string;
      items: Array<{
        category: string;
        fees: Array<{ label: string; amount: string; note?: string }>;
      }>;
    };
  };
  tenants: {
    hero: { eyebrow: string; title: string; subtitle: string };
    trustPoints: Array<{ title: string; description: string }>;
    intro: string;
    benefits: string;
    choosingArea: { title: string; intro: string; points: string[] };
    findingProperty: { title: string; paragraphs: string[] };
    securingProperty: {
      title: string;
      steps: Array<{ title: string; description: string }>;
    };
    permittedPayments: string[];
    livingInHome: {
      title: string;
      intro: string;
      points: Array<{ title: string; description: string }>;
    };
    responsibilities: {
      title: string;
      intro: string;
      points: string[];
      outro: string;
    };
    confidentiality: string;
  };
}

export interface TenantLogoText {
  type: "text";
  lines: [string, string, string];
}

export interface TenantConfig {
  id: string;
  name: string;
  shortName: string;
  productName: string;
  domain: string;
  paymentRefPrefix: string;
  logo: TenantLogoText;
  theme: {
    navy: string;
    blue: string;
  };
  site: SiteContent;
}
