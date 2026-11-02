import { listEnquiries } from "@/lib/db/queries";
import { EnquiryPipelineSelect } from "@/components/admin/enquiry-pipeline-select";
import { AdminTable } from "@/components/admin/admin-page";

export default async function AdminEnquiriesPage() {
  const rows = await listEnquiries();

  return (
    <div>
      <h1 className="text-3xl font-bold">Enquiries</h1>
      <p className="mt-1 text-muted-foreground">Lettings pipeline</p>
      <div className="mt-6">
        <AdminTable headers={["Name", "Email", "Property", "Source", "Pipeline", "Date"]}>
          {rows.map(({ enquiry, displayAddress }) => (
            <tr key={enquiry.id}>
              <td className="px-4 py-3">{enquiry.name}</td>
              <td className="px-4 py-3">{enquiry.email}</td>
              <td className="px-4 py-3">{displayAddress ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{enquiry.source}</td>
              <td className="px-4 py-3">
                <EnquiryPipelineSelect
                  id={enquiry.id}
                  stage={enquiry.pipelineStage ?? enquiry.status}
                  propertyId={enquiry.propertyId}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(enquiry.createdAt).toLocaleString("en-GB")}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
