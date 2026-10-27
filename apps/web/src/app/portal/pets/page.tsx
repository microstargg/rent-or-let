import { requireRenterSession } from "@/lib/auth/server";
import { listPetRequestsForRenter } from "@/lib/db/queries";
import { PortalPetForm } from "@/components/portal/portal-pet-form";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";

export default async function PortalPetsPage() {
  const ctx = await requireRenterSession();
  if (!ctx) return null;
  const rows = await listPetRequestsForRenter(ctx.profile.profile.renterId);

  return (
    <div>
      <AdminPageHeader
        title="Pet requests"
        description="Ask in writing to keep a pet. The landlord must reply within 28 days."
      />
      <PortalPetForm />
      <div className="mt-8 space-y-3">
        {rows.map(({ request, propertyAddress }) => (
          <div key={request.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{propertyAddress}</p>
                <p className="text-sm text-muted-foreground">
                  Submitted {formatDate(request.requestedAt)} · reply due {formatDate(request.dueAt)}
                </p>
                <p className="mt-2 text-sm">{request.petDescription}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
