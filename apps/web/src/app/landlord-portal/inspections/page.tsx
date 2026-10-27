import { requireLandlordSession } from "@/lib/auth/server";
import { listInspectionsForLandlord } from "@/lib/db/queries";
import { AdminEmptyState, AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function LandlordInspectionsPage() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;
  const rows = await listInspectionsForLandlord(ctx.profile.profile.landlordId);

  return (
    <div>
      <AdminPageHeader title="Inspections" description="Scheduled visits and completed reports" />
      <div className="mt-8 space-y-3">
        {rows.map(({ inspection, propertyAddress }) => (
          <div key={inspection.id} className="rounded-xl border bg-card p-4">
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
              <Button asChild size="sm" variant="outline" className="mt-3">
                <a href={`/api/inspections/${inspection.id}/pdf`}>Download report</a>
              </Button>
            )}
          </div>
        ))}
        {!rows.length && (
          <AdminEmptyState
            title="No inspections yet"
            description="Inspection visits booked by your agent will appear here."
          />
        )}
      </div>
    </div>
  );
}
