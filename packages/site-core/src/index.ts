export interface PublicListingImage {
  url: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PublicListing {
  id: string;
  slug: string;
  displayAddress: string;
  street: string;
  town: string;
  postcode: string;
  pricePcm: number;
  deposit: number;
  holdingDeposit?: number;
  availableFrom: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  furnished: string;
  description: string;
  summary?: string;
  features: string[];
  epcRating?: string;
  virtualTourUrl?: string;
  floorplanUrl?: string;
  epcUrl?: string;
  images: PublicListingImage[];
}

export interface PublicAgencyBranding {
  slug: string;
  name: string;
  shortName: string;
  productName: string;
  logo: {
    type: "text";
    lines: [string, string, string];
  };
  theme: {
    navy: string;
    blue: string;
  };
  site: unknown;
  features: {
    website: boolean;
  };
}

export const PUBLIC_API = {
  branding: "/api/v1/public/branding",
  listings: "/api/v1/public/listings",
  listing: (slug: string) => `/api/v1/public/listings/${encodeURIComponent(slug)}`,
  enquiries: "/api/v1/public/enquiries",
  applications: "/api/v1/public/applications",
  complaints: "/api/v1/public/complaints",
  revalidate: "/api/revalidate",
} as const;
