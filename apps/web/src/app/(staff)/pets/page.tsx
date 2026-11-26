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
import { formatDay } from "@/lib/utils";

const DECIDED = ["approved", "refused"];

function daysLeft(dueAt: Date | string) {
  const due = new Date(dueAt).getTime();
  return Math.ceil((due - Date.now()) / 86400000);
}

export default async function AdminPetsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listPetRequests(branch.id) : [];
  const open = rows
    .filter((r) => !DECIDED.includes(r.request.status))
    .sort((a, b) => new Date(a.request.dueAt).getTime() - new Date(b.request.dueAt).getTime());
  const decided = rows.filter((r) => DECIDED.includes(r.request.status));

  return (
    <div>
      <AdminPageHeader
        title="Pet requests"
        description="Reply in writing within 28 days of the request (Housing Act 1988 s.16A)."
      />
      <AdminSection title={`Waiting for a reply${open.length ? ` (${open.length})` : ""}`}>
        {open.length ? (
          <div className="space-y-3">
            {open.map(({ request, propertyAddress, renterFirstName, renterLastName }) => {
              const overdue = isPetRequestOverdue({ status: request.status, dueAt: request.dueAt });
              const left = daysLeft(request.dueAt);
              return (
                <div key={request.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{propertyAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {displayPersonName(renterFirstName ?? "", renterLastName ?? "")}
                      </p>
                      <p className="mt-2 text-sm">{request.petDescription}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${overdue || left < 0 ? "text-red-700" : left <= 7 ? "text-amber-700" : "text-foreground"}`}
                      >
                        {left < 0
                          ? `${Math.abs(left)} ${Math.abs(left) === 1 ? "day" : "days"} late`
                          : left === 0
                            ? "Reply due today"
                            : `${left} ${left === 1 ? "day" : "days"} left to reply`}
                      </p>
                      <p className="text-xs text-muted-foreground">Due {formatDay(request.dueAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <PetRequestActions id={request.id} overdue={overdue} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState title="Nothing waiting" description="Tenants can send a pet request from the portal." />
        )}
      </AdminSection>

      {decided.length > 0 && (
        <details className="mt-6 rounded-xl border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Decided ({decided.length})</summary>
          <ul className="divide-y border-t">
            {decided.map(({ request, propertyAddress, renterFirstName, renterLastName }) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{propertyAddress}</p>
                  <p className="text-muted-foreground">
                    {displayPersonName(renterFirstName ?? "", renterLastName ?? "")} · {request.petDescription}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={request.status} tone={request.status === "approved" ? "success" : "neutral"} />
                  <a className="text-primary hover:underline" href={`/api/admin/pets/${request.id}/pdf`}>
                    Written decision
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
