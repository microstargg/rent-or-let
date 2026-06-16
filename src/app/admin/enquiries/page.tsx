import { listEnquiries } from "@/lib/db/queries";
import { EnquiryStatusSelect } from "@/components/admin/enquiry-status-select";

export default async function AdminEnquiriesPage() {
  const rows = await listEnquiries();

  return (
    <div>
      <h1 className="text-3xl font-bold">Enquiries</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Status</th>
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
                  <EnquiryStatusSelect id={enquiry.id} status={enquiry.status} />
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
