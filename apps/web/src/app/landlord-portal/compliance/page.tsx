import { requireLandlordSession } from "@/lib/auth/server";
import { listComplianceItems, listPropertiesForLandlord } from "@/lib/db/queries";

export default async function LandlordPortalCompliance() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const props = await listPropertiesForLandlord(ctx.profile.profile.landlordId);
  const propIds = new Set(props.map((p) => p.id));
  const items = await listComplianceItems(ctx.profile.profile.branchId);
  const mine = items.filter((i) => propIds.has(i.item.propertyId));

  return (
    <div>
      <h1 className="text-3xl font-bold">Compliance</h1>
      <div className="mt-8 space-y-3">
        {mine.map(({ item, propertyAddress }) => (
          <div key={item.id} className="rounded-xl border p-4">
            <p className="font-semibold capitalize">
              {item.type.replaceAll("_", " ")} — {item.status}
            </p>
            <p className="text-sm text-muted-foreground">
              {propertyAddress} · expires {item.expiresAt ?? "—"}
            </p>
          </div>
        ))}
        {!mine.length && <p className="text-muted-foreground">No compliance items</p>}
      </div>
    </div>
  );
}
