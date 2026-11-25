import { listBranchRequirements } from "@/lib/db/queries/compliance";
import { listPropertiesForLandlord } from "@/lib/db/queries";
import { complianceLabel } from "@/lib/portal-format";
import { getLandlordById } from "@/lib/db/queries/operations";
import { sortRequirements, type ComplianceStatus, type Requirement } from "./requirements";
import { REGISTER_FEE_PER_PROPERTY, REGISTER_LEAD_DAYS, REGISTER_WINDOWS, type RegisterRegion } from "./register";

export interface LandlordRegisterRow {
  propertyId: string;
  address: string;
  regionLabel: string | null;
  opens: string | null;
  deadline: string | null;
  propertyNumber: string | null;
  isLet: boolean;
  status: string;
}

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

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Everything a landlord should see about compliance on their properties:
 * every requirement (including ones not on file yet) and the things only they
 * can do. Nothing the agency tracks is hidden from them.
 */
export async function getLandlordCompliance(landlordId: string, branchId: string) {
  const [props, landlord] = await Promise.all([listPropertiesForLandlord(landlordId), getLandlordById(landlordId)]);
  const rows = await listBranchRequirements(branchId, { propertyIds: props.map((p) => p.id) });
  const properties: LandlordComplianceProperty[] = rows.map(({ property, requirements }) => ({
    id: property.id,
    address: property.displayAddress,
    requirements: sortRequirements(requirements),
  }));

  const actions: LandlordAction[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const register: LandlordRegisterRow[] = rows.map(({ property, register: r }) => ({
    propertyId: property.id,
    address: property.displayAddress,
    regionLabel: r.region ? REGISTER_WINDOWS[r.region as RegisterRegion].label : null,
    opens: r.opens,
    deadline: r.deadline,
    propertyNumber: r.propertyNumber,
    isLet: r.isLet,
    status: r.status,
  }));
  const firstOpening = register
    .filter((r) => r.isLet && r.opens)
    .map((r) => r.opens!)
    .sort()[0];
  if (!landlord?.prsRegistrationNumber && firstOpening && today >= addDays(firstOpening, -REGISTER_LEAD_DAYS)) {
    actions.push({
      key: "register-landlord",
      title: "Register yourself on the government's landlord register",
      detail:
        "Sign in with GOV.UK One Login to get your landlord number (L-XXXX-XXXX). It's free, and you need it before you can register your properties. Send your agent the number when you have it.",
      propertyAddress: null,
      dueDate: firstOpening,
      status: "expiring",
    });
  }
  for (const p of properties) {
    for (const r of p.requirements) {
      if (r.responsible !== "landlord" || r.status === "valid") continue;
      if (r.type === "prs_register") {
        const registered = Boolean(r.dueDate && register.find((x) => x.propertyId === p.id)?.propertyNumber);
        actions.push({
          key: `${p.id}:${r.key}`,
          title: registered
            ? "Renew your landlord register fees"
            : `Register ${p.address} on the landlord register`,
          detail: registered
            ? `The £${REGISTER_FEE_PER_PROPERTY} per property yearly fee is due. Renew on GOV.UK so the registration stays active.`
            : `Start the registration on GOV.UK and pay the £${REGISTER_FEE_PER_PROPERTY} yearly fee. You can send your agent a link so they add the certificates and tenancy details for you.`,
          propertyAddress: p.address,
          dueDate: r.dueDate ?? null,
          status: r.status,
        });
        continue;
      }
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
    register,
    landlordNumber: landlord?.prsRegistrationNumber ?? null,
    renewalDate: landlord?.prsRenewalDate ?? null,
    all,
    counts: { valid: count("valid"), expiring: count("expiring"), expired: count("expired"), missing: count("missing") },
  };
}
