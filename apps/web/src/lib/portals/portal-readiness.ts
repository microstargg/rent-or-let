/** Rightmove RTDF practical limits for lettings listings. */
export const PORTAL_LIMITS = {
  summary: 300,
  description: 15000,
  features: 10,
} as const;

export interface PortalReadinessInput {
  agent_ref?: string;
  house_name_number?: string;
  street?: string;
  postcode?: string;
  summary?: string;
  description?: string;
  features?: string[];
  status?: string;
  imageCount?: number;
}

export interface PortalCheckItem {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function getPortalReadiness(input: PortalReadinessInput): {
  items: PortalCheckItem[];
  ready: boolean;
} {
  const features = input.features ?? [];
  const summaryLen = input.summary?.trim().length ?? 0;
  const descriptionLen = input.description?.trim().length ?? 0;
  const postcode = input.postcode?.trim() ?? "";

  const items: PortalCheckItem[] = [
    {
      id: "agent_ref",
      label: "Agent reference set",
      ok: Boolean(input.agent_ref?.trim()),
    },
    {
      id: "house_number",
      label: "House name or number set",
      ok: Boolean(input.house_name_number?.trim()),
      hint: "Used by Rightmove and OnTheMarket for the address line sent to portals.",
    },
    {
      id: "street",
      label: "Street address set",
      ok: Boolean(input.street?.trim()),
    },
    {
      id: "postcode",
      label: "Valid UK postcode",
      ok: UK_POSTCODE.test(postcode),
    },
    {
      id: "summary",
      label: `Summary (${summaryLen}/${PORTAL_LIMITS.summary} chars)`,
      ok: summaryLen > 0 && summaryLen <= PORTAL_LIMITS.summary,
      hint: summaryLen === 0 ? "Add a short headline for portal search results." : undefined,
    },
    {
      id: "description",
      label: `Description (${descriptionLen.toLocaleString()}/${PORTAL_LIMITS.description.toLocaleString()} chars)`,
      ok: descriptionLen > 0 && descriptionLen <= PORTAL_LIMITS.description,
    },
    {
      id: "features",
      label: `Features (${features.length}/${PORTAL_LIMITS.features} max for portals)`,
      ok: features.length <= PORTAL_LIMITS.features,
      hint:
        features.length > PORTAL_LIMITS.features
          ? "Only the first 10 features are sent to Rightmove and OnTheMarket."
          : undefined,
    },
    {
      id: "photos",
      label: "At least one photo uploaded",
      ok: (input.imageCount ?? 0) > 0,
      hint: "Portals require photos — upload after saving the property.",
    },
  ];

  const publishing = input.status === "available";
  const ready = publishing ? items.every((item) => item.ok) : true;

  return { items, ready };
}
