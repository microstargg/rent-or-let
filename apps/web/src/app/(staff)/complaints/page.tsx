import Link from "next/link";
import { listComplaints, listAllProperties } from "@/lib/db/queries";
import { listActivityForEntities } from "@/lib/db/queries/activity";
import { ComplaintStatusSelect } from "@/components/admin/complaint-status-select";
import { ComplaintLogForm, ComplaintResponseForm } from "@/components/admin/complaint-forms";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "@/components/admin/admin-page";
import { formatDateTime, formatDay, humanize } from "@/lib/utils";

const CLOSED = new Set(["resolved", "closed"]);

function deadlineText(due: Date) {
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} late`, tone: "text-red-700" };
  if (days === 0) return { text: "Reply due today", tone: "text-red-700" };
  return { text: `${days} ${days === 1 ? "day" : "days"} left`, tone: days <= 2 ? "text-amber-700" : "text-foreground" };
}

const TIMELINE_LABEL: Record<string, string> = {
  "complaint.logged": "Logged",
  "complaint.status": "Status",
  "complaint.response": "Response sent",
  "complaint.note": "Internal note",
};

export default async function AdminComplaintsPage() {
  const [rows, properties] = await Promise.all([listComplaints(), listAllProperties()]);
  const activity = await listActivityForEntities(rows.map((r) => r.complaint.id));
  const timelineFor = (id: string) => activity.filter((a) => a.entityId === id);

  const open = rows
    .filter((r) => !CLOSED.has(r.complaint.status))
    .sort((a, b) => (a.complaint.slaDueAt?.getTime() ?? Infinity) - (b.complaint.slaDueAt?.getTime() ?? Infinity));
  const closed = rows.filter((r) => CLOSED.has(r.complaint.status));

  const card = ({ complaint, propertyAddress }: (typeof rows)[number]) => {
    const timeline = timelineFor(complaint.id);
    const isOpen = !CLOSED.has(complaint.status);
    const deadline = isOpen && complaint.slaDueAt ? deadlineText(complaint.slaDueAt) : null;
    return (
      <div key={complaint.id} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">{complaint.subject}</h3>
            <p className="text-sm text-muted-foreground">
              {complaint.tenantName}
              {complaint.tenantEmail && (
                <>
                  {" · "}
                  <a href={`mailto:${complaint.tenantEmail}`} className="hover:underline">
                    {complaint.tenantEmail}
                  </a>
                </>
              )}
            </p>
            {complaint.propertyId && (
              <p className="mt-0.5 text-sm">
                <Link href={`/properties/${complaint.propertyId}`} className="text-primary hover:underline">
                  {propertyAddress ?? "Property"}
                </Link>
                {" · "}
                <Link href={`/properties/${complaint.propertyId}?tab=repairs`} className="text-primary hover:underline">
                  Repairs
                </Link>
              </p>
            )}
          </div>
          <div className="flex items-start gap-3">
            {deadline && (
              <div className="text-right">
                <p className={`text-sm font-semibold ${deadline.tone}`}>{deadline.text}</p>
                <p className="text-xs text-muted-foreground">Due {formatDay(complaint.slaDueAt!)}</p>
              </div>
            )}
            <ComplaintStatusSelect id={complaint.id} status={complaint.status} />
          </div>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm">{complaint.description}</p>

        <ol className="mt-3 space-y-2 border-l pl-4 text-sm">
          <li className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(complaint.createdAt)} · Received ({humanize(complaint.source)})
            </span>
          </li>
          {timeline
            .filter((a) => a.action !== "complaint.logged")
            .map((a) => (
              <li key={a.id} className="relative">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${a.action === "complaint.response" ? "bg-primary" : "bg-muted-foreground"}`}
                />
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.createdAt)} · {TIMELINE_LABEL[a.action] ?? humanize(a.action)}
                  {a.actorName ? ` · ${a.actorName}` : ""}
                </p>
                {a.action !== "complaint.status" ? (
                  <p className="whitespace-pre-line">{a.summary}</p>
                ) : (
                  <p>{a.summary}</p>
                )}
              </li>
            ))}
        </ol>
        <div className="mt-3">
          <ComplaintResponseForm id={complaint.id} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="Complaints"
        description="Every complaint, what you said back and when. Keep this up to date: it's what the redress scheme will ask for."
        actions={
          <AdminEntityDialog triggerLabel="Log complaint" title="Log complaint" description="For complaints by phone, email, letter or in person.">
            <ComplaintLogForm properties={properties.map((p) => ({ id: p.id, label: p.displayAddress }))} />
          </AdminEntityDialog>
        }
      />
      <AdminSection title={`Open${open.length ? ` (${open.length})` : ""}`}>
        {open.length ? <div className="space-y-4">{open.map(card)}</div> : <AdminEmptyState title="No open complaints" />}
      </AdminSection>
      {closed.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium">Resolved and closed ({closed.length})</summary>
          <div className="mt-3 space-y-4">{closed.map(card)}</div>
        </details>
      )}
    </div>
  );
}
