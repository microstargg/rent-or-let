import type { Property, PropertyImage, PortalName } from "@/types";
import { formatRtdfDate, formatRtdfTimestamp, parseRtdfId } from "./rtdf-format";

export interface RTDFPropertyPayload {
  network: { network_id: number };
  branch: { branch_id: number; channel: number };
  property: {
    agent_ref: string;
    published: boolean;
    property_type: number;
    status: number;
    create_date: string;
    update_date: string;
    date_available: string;
    address: {
      house_name_number: string;
      address_2: string;
      town: string;
      postcode_1: string;
      postcode_2: string;
      display_address: string;
    };
    price_information: {
      price: number;
      price_qualifier: number;
      deposit: number;
      rent_frequency: number;
    };
    details: {
      summary: string;
      description: string;
      bedrooms: number;
      bathrooms: number;
      furnished_type: number;
      features?: string[];
    };
    media?: Array<{
      media_type: number;
      media_url: string;
      sort_order: number;
      media_update_date: string;
    }>;
  };
}

/** Rightmove RTDF property type codes (UK lettings). */
const PROPERTY_TYPE_MAP: Record<string, number> = {
  terraced: 1, // TerracedHouse
  semi_detached: 3, // SemiDetachedHouse
  detached: 4, // DetachedHouse
  flat: 8, // Flat
  bungalow: 12, // Bungalow
  commercial: 253, // CommercialProperty
};

/** Rightmove RTDF status codes for lettings. */
const STATUS_MAP: Record<string, number> = {
  available: 1, // Available
  let_agreed: 6, // LetAgreed
};

/** Rightmove RTDF furnished type codes. */
const FURNISHED_MAP: Record<string, number> = {
  furnished: 0,
  part_furnished: 1,
  unfurnished: 2,
};

/** Channel 2 = Lettings (Channels::Lettings). */
export const RTDF_LETTINGS_CHANNEL = 2;

/** Rent frequency 12 = per calendar month (RentFrequencies::Monthly). */
export const RTDF_RENT_FREQUENCY_MONTHLY = 12;

function splitPostcode(postcode: string): { pc1: string; pc2: string } {
  const parts = postcode.trim().toUpperCase().split(" ");
  if (parts.length >= 2) {
    return { pc1: parts[0], pc2: parts.slice(1).join(" ") };
  }
  return { pc1: postcode, pc2: "" };
}

/** Rightmove/OTM RTDF media type codes. */
const MEDIA_TYPE = {
  image: 1,
  floorplan: 2,
  virtualTour: 4,
  epc: 6,
} as const;

function buildPropertyMedia(
  property: Property & { images?: PropertyImage[] },
  mediaUpdateDate: string
): RTDFPropertyPayload["property"]["media"] {
  const media: NonNullable<RTDFPropertyPayload["property"]["media"]> = [];
  let sortOrder = 1;

  for (const img of property.images ?? []) {
    media.push({
      media_type: MEDIA_TYPE.image,
      media_url: img.url,
      sort_order: sortOrder++,
      media_update_date: mediaUpdateDate,
    });
  }

  if (property.floorplan_url) {
    media.push({
      media_type: MEDIA_TYPE.floorplan,
      media_url: property.floorplan_url,
      sort_order: sortOrder++,
      media_update_date: mediaUpdateDate,
    });
  }

  if (property.virtual_tour_url) {
    media.push({
      media_type: MEDIA_TYPE.virtualTour,
      media_url: property.virtual_tour_url,
      sort_order: sortOrder++,
      media_update_date: mediaUpdateDate,
    });
  }

  if (property.epc_url) {
    media.push({
      media_type: MEDIA_TYPE.epc,
      media_url: property.epc_url,
      sort_order: sortOrder++,
      media_update_date: mediaUpdateDate,
    });
  }

  return media.length ? media : undefined;
}

export function mapPropertyToRTDF(
  property: Property & { images?: PropertyImage[] },
  networkId: string,
  branchId: string
): RTDFPropertyPayload {
  const { pc1, pc2 } = splitPostcode(property.postcode);
  const now = formatRtdfTimestamp(new Date());
  const mediaUpdateDate = now;

  return {
    network: { network_id: parseRtdfId(networkId) },
    branch: { branch_id: parseRtdfId(branchId), channel: RTDF_LETTINGS_CHANNEL },
    property: {
      agent_ref: property.agent_ref,
      published: property.status === "available",
      property_type: PROPERTY_TYPE_MAP[property.property_type] ?? 1,
      status: STATUS_MAP[property.status] ?? 1,
      create_date: formatRtdfTimestamp(property.created_at),
      update_date: formatRtdfTimestamp(property.updated_at),
      date_available: formatRtdfDate(property.available_from),
      address: {
        house_name_number: property.house_name_number || property.street.split(" ")[0] || "0",
        address_2: property.street,
        town: property.town,
        postcode_1: pc1,
        postcode_2: pc2,
        display_address: property.display_address,
      },
      price_information: {
        price: property.price_pcm,
        price_qualifier: 0,
        deposit: property.deposit,
        rent_frequency: RTDF_RENT_FREQUENCY_MONTHLY,
      },
      details: {
        summary: property.summary ?? property.display_address,
        description: property.description,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        furnished_type: FURNISHED_MAP[property.furnished] ?? 2,
        ...(property.features?.length ? { features: property.features.slice(0, 10) } : {}),
      },
      media: buildPropertyMedia(property, mediaUpdateDate),
    },
  };
}

export interface PortalConfig {
  name: PortalName;
  endpoint: string;
  networkId: string;
  branchIdEnvKey: string;
  certEnvKey: string;
  certPasswordEnvKey: string;
}

export const PORTAL_CONFIGS: PortalConfig[] = [
  {
    name: "rightmove",
    endpoint: process.env.RIGHTMOVE_RTDF_URL ?? "https://adfapi.rightmove.co.uk/v1/property/",
    networkId: process.env.RIGHTMOVE_NETWORK_ID ?? "",
    branchIdEnvKey: "RIGHTMOVE_BRANCH_ID",
    certEnvKey: "RIGHTMOVE_CERT_PEM",
    certPasswordEnvKey: "RIGHTMOVE_CERT_PASSWORD",
  },
  {
    name: "onthemarket",
    endpoint: process.env.OTM_RTDF_URL ?? "https://realtime-api.onthemarket.com/v1/property/",
    networkId: process.env.OTM_NETWORK_ID ?? "",
    branchIdEnvKey: "OTM_BRANCH_ID",
    certEnvKey: "OTM_CERT_PEM",
    certPasswordEnvKey: "OTM_CERT_PASSWORD",
  },
];

/** Rightmove sandbox base URL — set RIGHTMOVE_RTDF_URL during beta testing. */
export const RIGHTMOVE_TEST_RTDF_URL = "https://adfapi.adftest.rightmove.com/v1/property/";
