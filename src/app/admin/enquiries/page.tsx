import {
  getDefaultBranch,
  listEnquiries,
  listViewings,
} from "@/lib/db/queries";
import { EnquiryPipelineSelect } from "@/components/admin/enquiry-pipeline-select";

export default async function AdminEnquiriesPage() {
  const branch = await getDefaultBranch();
  const rows = await listEnquiries();
  const viewings = branch ? await listViewings(branch.id) : [];
  const upcoming = viewings.filter(
    (v) => new Date(v.viewing.scheduledAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Enquiries</h1>
      <p className="mt-1 text-muted-foreground">Lettings pipeline and viewings</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Scheduled viewings</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No upcoming viewings. Book one from an enquiry row.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Enquiry</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ viewing, propertyAddress, enquiryName, enquiryEmail }) => (
                  <tr key={viewing.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {new Date(viewing.scheduledAt).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3">{propertyAddress}</td>
                    <td className="px-4 py-3">
                      {enquiryName ? (
                        <>
                          {enquiryName}
                          {enquiryEmail && (
                            <span className="block text-xs text-muted-foreground">
                              {enquiryEmail}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{viewing.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Pipeline</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ enquiry, displayAddress }) => (
              <tr key={enquiry.id} className="border-b last:border-0">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
