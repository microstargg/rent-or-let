import { getDefaultBranch, listEnquiries } from "@/lib/db/queries";
import { listViewingDiary, toViewingItem } from "@/lib/db/queries/viewings";
import { EnquiryPipelineSelect } from "@/components/admin/enquiry-pipeline-select";
import { AdminSection, AdminTable } from "@/components/admin/admin-page";
import { ViewingsList } from "@/components/admin/viewings-panel";

export default async function AdminEnquiriesPage() {
  const branch = await getDefaultBranch();
  const [rows, diary] = await Promise.all([listEnquiries(), branch ? listViewingDiary(branch.id) : []]);
  const now = Date.now();
  const toRecord = diary.filter((r) => r.viewing.scheduledAt.getTime() < now);
  const upcoming = diary.filter((r) => r.viewing.scheduledAt.getTime() >= now);

  return (
    <div>
      <h1 className="text-3xl font-bold">Enquiries</h1>
      <p className="mt-1 text-muted-foreground">Lettings pipeline and viewings</p>

      <AdminSection
        title="Viewings"
        description="The next two weeks. Viewers get a reminder the day before, and you can email feedback to the landlord afterwards."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Coming up</h3>
            <ViewingsList
              viewings={upcoming.map(toViewingItem)}
              showAddress
              empty="Nothing booked. Book from an enquiry below or from the property page."
            />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Needs an outcome</h3>
            <ViewingsList viewings={toRecord.map(toViewingItem)} showAddress empty="All recorded." />
          </div>
        </div>
      </AdminSection>

      <div className="mt-8">
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
