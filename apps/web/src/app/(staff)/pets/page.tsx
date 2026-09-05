import { getDefaultBranch, listPetRequests } from "@/lib/db/queries";
import { isPetRequestOverdue } from "@/lib/rra/pet-request";
import { PetRequestActions } from "@/components/admin/pet-request-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatusBadge,
} from "@/components/admin/admin-page";
import { displayPersonName } from "@/lib/person-name";
import { formatDate } from "@/lib/utils";

export default async function AdminPetsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listPetRequests(branch.id) : [];

  return (
    <div>
      <AdminPageHeader
        title="Pet requests"
        description="Respond in writing within 28 days (Housing Act 1988 s.16A)."
      />
      <AdminSection title="Open and decided">
        {rows.length ? (
          <div className="space-y-4">
            {rows.map(({ request, propertyAddress, renterFirstName, renterLastName }) => {
              const overdue = isPetRequestOverdue({
                status: request.status,
                dueAt: request.dueAt,
              });
              return (
                <div key={request.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{propertyAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {displayPersonName(renterFirstName ?? "", renterLastName ?? "")} · due{" "}
                        {formatDate(request.dueAt)}
                      </p>
                      <p className="mt-2 text-sm">{request.petDescription}</p>
                    </div>
                    <StatusBadge
                      status={request.status.replaceAll("_", " ")}
                      tone={overdue ? "danger" : request.status === "approved" ? "success" : "warning"}
                    />
                  </div>
                  {!["approved", "refused"].includes(request.status) && (
                    <div className="mt-3">
                      <PetRequestActions id={request.id} overdue={overdue} />
                    </div>
                  )}
                  {["approved", "refused"].includes(request.status) && (
                    <a
                      className="mt-3 inline-block text-sm text-primary underline"
                      href={`/api/admin/pets/${request.id}/pdf`}
                    >
                      Download written decision
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="No pet requests"
            description="Tenants can submit a request from the portal."
          />
        )}
      </AdminSection>
    </div>
  );
}
