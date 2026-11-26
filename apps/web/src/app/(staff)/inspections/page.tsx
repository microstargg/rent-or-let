import Link from "next/link";
import { getDefaultBranch, listInspections, listTenancies } from "@/lib/db/queries";
import { listAssignableStaff } from "@/lib/db/queries/notifications";
import { requireStaffSession } from "@/lib/auth/server";
import { NewInspectionDialog } from "@/components/admin/new-inspection-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { displayPersonName } from "@/lib/person-name";
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminTable } from "@/components/admin/admin-page";
import { formatDateTime, formatDay, humanize } from "@/lib/utils";

export default async function AdminInspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();
  const [branch, session] = await Promise.all([getDefaultBranch(), requireStaffSession()]);
  const [rows, tenancyRows, staff] = await Promise.all([
    branch ? listInspections(branch.id) : [],
    branch ? listTenancies(branch.id) : [],
    listAssignableStaff(),
  ]);
  const tenancyOptions = tenancyRows.map(({ tenancy, propertyAddress, renterFirstName, renterLastName }) => ({
    id: tenancy.id,
    propertyId: tenancy.propertyId,
    label: `${propertyAddress} — ${displayPersonName(renterFirstName, renterLastName)}${
      tenancy.status === "active" ? "" : ` (${tenancy.status})`
    }`,
  }));
  const staffName = (id: unknown) =>
    typeof id === "string" ? staff.find((s) => s.id === id)?.name ?? "Former staff" : null;

  const matching = rows.filter((r) => !q || (r.propertyAddress ?? "").toLowerCase().includes(q));
  const now = Date.now();
  const upcoming = matching
    .filter((r) => !r.inspection.completedAt)
    .sort(
      (a, b) =>
        (a.inspection.scheduledAt?.getTime() ?? Infinity) - (b.inspection.scheduledAt?.getTime() ?? Infinity)
    );
  const completed = matching
    .filter((r) => r.inspection.completedAt)
    .sort((a, b) => b.inspection.completedAt!.getTime() - a.inspection.completedAt!.getTime());

  const who = (meta: unknown) => staffName((meta as { inspector_staff_id?: unknown } | null)?.inspector_staff_id);

  return (
    <div>
      <AdminPageHeader
        title="Inspections"
        description="Room-by-room check-in, interim and check-out reports."
        actions={<NewInspectionDialog tenancies={tenancyOptions} staff={staff} currentStaffId={session?.user.id ?? null} />}
      />

      <div className="mt-6">
        <AdminListToolbar searchPlaceholder="Search by address" />
      </div>

      <AdminSection title={`Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}`} description="Soonest first. Overdue visits are in red.">
        {upcoming.length ? (
          <AdminTable headers={["Property", "Type", "When", "Who"]}>
            {upcoming.map(({ inspection, propertyAddress }) => {
              const overdue = inspection.scheduledAt ? inspection.scheduledAt.getTime() < now : false;
              return (
                <tr key={inspection.id} className="row-link">
                  <td className="px-4 py-3">
                    <Link href={`/inspections/${inspection.id}`} className="row-link-main">
                      {propertyAddress}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{humanize(inspection.type)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${overdue ? "font-medium text-red-700" : ""}`}>
                    {inspection.scheduledAt ? formatDateTime(inspection.scheduledAt) : <span className="text-muted-foreground">Not booked</span>}
                    {overdue && <span className="block text-xs">Overdue</span>}
                  </td>
                  <td className="px-4 py-3">{who(inspection.meta) ?? <span className="text-muted-foreground">Not decided</span>}</td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <AdminEmptyState title={q ? "Nothing matches" : "Nothing booked"} description={q ? undefined : "Use New inspection to book one."} />
        )}
      </AdminSection>

      <AdminSection title="Completed">
        {completed.length ? (
          <AdminTable headers={["Property", "Type", "Done", "Who"]}>
            {completed.slice(0, 100).map(({ inspection, propertyAddress }) => (
              <tr key={inspection.id} className="row-link">
                <td className="px-4 py-3">
                  <Link href={`/inspections/${inspection.id}`} className="row-link-main">
                    {propertyAddress}
                  </Link>
                </td>
                <td className="px-4 py-3">{humanize(inspection.type)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDay(inspection.completedAt!)}</td>
                <td className="px-4 py-3 text-muted-foreground">{who(inspection.meta) ?? "—"}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState title="None completed yet" />
        )}
      </AdminSection>
    </div>
  );
}
