export interface SiteContent {
  hero: {
    subtitle: string;
  };
  about: {
    summary: string;
    paragraphs: string[];
    highlights: Array<{ title: string; description: string }>;
  };
  contact: {
    phone: string;
    fax?: string;
    email: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      postcode: string;
    };
    hours: Array<{ day: string; hours: string }>;
  };
  cmp: {
    scheme: string;
    certificateUrl: string;
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
