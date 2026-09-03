import { requireLandlordSession } from "@/lib/auth/server";
import { listInspectionsForLandlord } from "@/lib/db/queries";
import { StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";

export default async function LandlordInspectionsPage() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;
  const rows = await listInspectionsForLandlord(ctx.profile.profile.landlordId);

  return (
    <div>
      <h1 className="text-3xl font-bold">Inspections</h1>
      <p className="mt-1 text-muted-foreground">Scheduled visits and completed reports</p>
      <div className="mt-6 space-y-3">
        {rows.map(({ inspection, propertyAddress }) => (
          <div key={inspection.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{propertyAddress}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {inspection.type.replaceAll("_", " ")}
                  {inspection.scheduledAt ? ` · ${formatDate(inspection.scheduledAt)}` : ""}
                </p>
              </div>
              <StatusBadge
                status={inspection.completedAt ? "completed" : "scheduled"}
                tone={inspection.completedAt ? "success" : "warning"}
              />
            </div>
            {inspection.completedAt && (
              <a
                className="mt-2 inline-block text-sm text-primary underline"
                href={`/api/inspections/${inspection.id}/pdf`}
              >
                Download report
              </a>
            )}
          </div>
        ))}
        {!rows.length && <p className="text-muted-foreground">No inspections recorded yet.</p>}
      </div>
    </div>
  );
}
