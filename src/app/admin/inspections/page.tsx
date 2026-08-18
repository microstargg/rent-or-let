import Link from "next/link";
import { getDefaultBranch, listInspections } from "@/lib/db/queries";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatusBadge,
} from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";

export default async function AdminInspectionsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listInspections(branch.id) : [];

  return (
    <div>
      <AdminPageHeader
        title="Inspections"
        description="Room-by-room check-in, interim and check-out reports."
      />
      <AdminSection title="Scheduled and completed">
        {rows.length ? (
          <AdminTable headers={["Property", "Type", "Scheduled", "Status"]}>
            {rows.map(({ inspection, propertyAddress }) => (
              <tr key={inspection.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/inspections/${inspection.id}`} className="font-medium text-primary">
                    {propertyAddress}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{inspection.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  {inspection.scheduledAt ? formatDate(inspection.scheduledAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={inspection.completedAt ? "completed" : "open"}
                    tone={inspection.completedAt ? "success" : "warning"}
                  />
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="No inspections yet"
            description="Create a move-in inspection from Deposits & notices."
          />
        )}
      </AdminSection>
    </div>
  );
}
