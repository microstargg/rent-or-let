import type { PortalConfig } from "./rtdf-mapper";
import type { RTDFPropertyPayload } from "./rtdf-mapper";
import { RTDF_LETTINGS_CHANNEL } from "./rtdf-mapper";
import { parseRtdfId } from "./rtdf-format";
import { getPortalAgent, isPortalConfigured, rtdfRequest } from "./rtdf-http";

export interface RTDFResponse {
  success: boolean;
  message?: string;
  property_id?: string;
  external_id?: string;
  raw?: unknown;
}

function extractExternalPropertyId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const property = (data as { property?: Record<string, unknown> }).property;
  if (!property) return undefined;

  const id =
    property.otm_id ??
    property.portal_id ??
    property.rightmove_id ??
    property.agent_ref;

  return id != null ? String(id) : undefined;
}

export async function sendProperty(
  config: PortalConfig,
  payload: RTDFPropertyPayload,
  branchId: string
): Promise<RTDFResponse> {
  const agent = getPortalAgent(config);

  if (!isPortalConfigured(config) || !agent) {
    return {
      success: false,
      message: `${config.name} credentials not configured — job queued for later sync`,
    };
  }

  const url = `${config.endpoint}sendpropertydetails`;

  try {
    const response = await rtdfRequest(url, {
      method: "POST",
      agent,
      body: JSON.stringify({
        ...payload,
        branch: { ...payload.branch, branch_id: parseRtdfId(branchId) },
      }),
    });

    const data = response.data as { property?: { agent_ref?: string }; message?: string };

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${data.message ?? response.text}`,
        raw: data,
      };
    }

    return {
      success: true,
      property_id: data.property?.agent_ref,
      external_id: extractExternalPropertyId(data),
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function removeProperty(
  config: PortalConfig,
  networkId: string,
  branchId: string,
  agentRef: string
): Promise<RTDFResponse> {
  const agent = getPortalAgent(config);

  if (!isPortalConfigured(config) || !agent) {
    return { success: false, message: `${config.name} credentials not configured` };
  }

  const url = `${config.endpoint}removeproperty`;

  try {
    const response = await rtdfRequest(url, {
      method: "POST",
      agent,
      body: JSON.stringify({
        network: { network_id: parseRtdfId(networkId) },
        branch: { branch_id: parseRtdfId(branchId), channel: RTDF_LETTINGS_CHANNEL },
        property: { agent_ref: agentRef },
      }),
    });

    const data = response.data;
    return {
      success: response.ok,
      message: response.ok ? undefined : `HTTP ${response.status}: ${response.text}`,
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getBranchPropertyList(
  config: PortalConfig,
  branchId: string
): Promise<{ success: boolean; properties?: string[]; message?: string }> {
  const agent = getPortalAgent(config);

  if (!isPortalConfigured(config) || !agent) {
    return { success: false, message: "Credentials not configured" };
  }

  const url = `${config.endpoint}getbranchpropertylist`;

  try {
    const response = await rtdfRequest(url, {
      method: "POST",
      agent,
      body: JSON.stringify({
        network: { network_id: parseRtdfId(config.networkId) },
        branch: { branch_id: parseRtdfId(branchId), channel: RTDF_LETTINGS_CHANNEL },
      }),
    });

    const data = response.data as {
      property?: Array<{ agent_ref: string }>;
      message?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        message: data.message ?? `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      properties: data.property?.map((p) => p.agent_ref) ?? [],
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
