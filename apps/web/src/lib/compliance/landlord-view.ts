import { listBranchRequirements } from "@/lib/db/queries/compliance";
import { listPropertiesForLandlord } from "@/lib/db/queries";
import { complianceLabel } from "@/lib/portal-format";
import { sortRequirements, type ComplianceStatus, type Requirement } from "./requirements";

export interface LandlordAction {
  key: string;
  title: string;
  detail: string;
  propertyAddress: string | null;
  dueDate: string | null;
  status: ComplianceStatus;
}

export interface LandlordComplianceProperty {
  id: string;
  address: string;
  requirements: Requirement[];
}

/**
 * Everything a landlord should see about compliance on their properties:
 * every requirement (including ones not on file yet) and the things only they
 * can do. Nothing the agency tracks is hidden from them.
 */
export async function getLandlordCompliance(landlordId: string, branchId: string) {
  const props = await listPropertiesForLandlord(landlordId);
  const rows = await listBranchRequirements(branchId, { propertyIds: props.map((p) => p.id) });
  const properties: LandlordComplianceProperty[] = rows.map(({ property, requirements }) => ({
    id: property.id,
    address: property.displayAddress,
    requirements: sortRequirements(requirements),
  }));

  const actions: LandlordAction[] = [];
  for (const p of properties) {
    for (const r of p.requirements) {
      if (r.responsible !== "landlord" || r.status === "valid") continue;
      actions.push({
        key: `${p.id}:${r.key}`,
        title:
          r.status === "missing"
            ? `Send your agent your ${complianceLabel(r.type).toLowerCase()}`
            : `Renew your ${complianceLabel(r.type).toLowerCase()}`,
        detail: r.reason,
        propertyAddress: p.address,
        dueDate: r.item?.expiresAt ?? null,
        status: r.status,
      });
    }
  }

  const all = properties.flatMap((p) => p.requirements.map((r) => ({ ...r, propertyAddress: p.address })));
  const count = (s: ComplianceStatus) => all.filter((r) => r.status === s).length;
  return {
    properties,
    actions,
    all,
    counts: { valid: count("valid"), expiring: count("expiring"), expired: count("expired"), missing: count("missing") },
  };
}
