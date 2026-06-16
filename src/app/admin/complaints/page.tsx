import { listComplaints } from "@/lib/db/queries";
import { ComplaintStatusSelect } from "@/components/admin/complaint-status-select";

export default async function AdminComplaintsPage() {
  const complaints = await listComplaints();

  return (
    <div>
      <h1 className="text-3xl font-bold">Complaints</h1>
      <div className="mt-6 space-y-4">
        {complaints.map((complaint) => (
          <div key={complaint.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{complaint.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  {complaint.tenantName} — {complaint.tenantEmail}
                </p>
              </div>
              <ComplaintStatusSelect id={complaint.id} status={complaint.status} />
            </div>
            <p className="mt-3 text-sm">{complaint.description}</p>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>Source: {complaint.source}</span>
              <span>Priority: {complaint.priority}</span>
              {complaint.slaDueAt && (
                <span>SLA: {new Date(complaint.slaDueAt).toLocaleDateString("en-GB")}</span>
              )}
              <span>{new Date(complaint.createdAt).toLocaleString("en-GB")}</span>
            </div>
          </div>
        ))}
        {!complaints.length && (
          <p className="text-muted-foreground">No complaints logged</p>
        )}
      </div>
    </div>
  );
}
