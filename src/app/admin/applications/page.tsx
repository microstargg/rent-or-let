import { listTenantApplications } from "@/lib/db/queries";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { ConvertApplicationButton } from "@/components/admin/convert-application-button";

export default async function AdminApplicationsPage() {
  const rows = await listTenantApplications();

  return (
    <div>
      <h1 className="text-3xl font-bold">Tenant applications</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Applicant</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-left">Referencing</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ application, displayAddress }) => (
              <tr key={application.id} className="border-b last:border-0">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
