import { listTenantApplications } from "@/lib/db/queries";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { ConvertApplicationButton } from "@/components/admin/convert-application-button";
import { AdminTable } from "@/components/admin/admin-page";

export default async function AdminApplicationsPage() {
  const rows = await listTenantApplications();

  return (
    <div>
      <h1 className="text-3xl font-bold">Tenant applications</h1>
      <div className="mt-6">
        <AdminTable headers={["Applicant", "Email", "Property", "Referencing", "Status", "Actions"]}>
          {rows.map(({ application, displayAddress }) => (
            <tr key={application.id}>
              <td className="px-4 py-3">
                {application.firstName} {application.lastName}
              </td>
              <td className="px-4 py-3">{application.email}</td>
              <td className="px-4 py-3">{displayAddress ?? "General"}</td>
              <td className="px-4 py-3 capitalize">
                {application.referencingStatus ?? "pending"}
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusSelect id={application.id} status={application.status} />
              </td>
              <td className="px-4 py-3">
                {application.propertyId && application.status !== "approved" && (
                  <ConvertApplicationButton applicationId={application.id} />
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
