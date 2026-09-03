import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTicketById,
  listTicketMessages,
  listWorkOrders,
  listContractors,
  getDefaultBranch,
  listDocumentsForEntity,
} from "@/lib/db/queries";
import { TicketStatusSelect } from "@/components/admin/ticket-status-select";
import { TicketMessageForm } from "@/components/admin/ticket-message-form";
import { WorkOrderPanel } from "@/components/admin/work-order-panel";
import { StatusBadge } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branch = await getDefaultBranch();
  const ticketRow = await getTicketById(id);
  if (!ticketRow) notFound();

  const [messages, workOrders, contractors, photos] = await Promise.all([
    listTicketMessages(id),
    listWorkOrders({ ticketId: id }),
    branch ? listContractors(branch.id) : [],
    listDocumentsForEntity("ticket", id),
  ]);

  const { ticket, propertyAddress } = ticketRow;
  const imageDocs = photos.filter(
    (d) => d.kind === "photo" || /\.(jpe?g|png|gif|webp)$/i.test(d.filename ?? d.url)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="min-h-11 px-2">
          <Link href="/admin/tickets">← Tickets</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="min-h-11">
          <Link href="/admin/jobs/board">Jobs board</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{ticket.summary}</h1>
          <p className="mt-1 text-muted-foreground">{propertyAddress}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            {ticket.priority && <StatusBadge status={ticket.priority} tone="info" />}
          </div>
        </div>
        <TicketStatusSelect id={ticket.id} status={ticket.status} />
      </div>

      {ticket.description && (
        <p className="mt-4 rounded-xl border bg-muted/20 p-4 text-sm">{ticket.description}</p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold">Updates</h2>
          <div className="mt-3 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {m.senderType} · {new Date(m.createdAt).toLocaleString("en-GB")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
            {!messages.length && (
              <p className="text-sm text-muted-foreground">No updates yet</p>
            )}
          </div>

          {imageDocs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Photos</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {imageDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.url}
                      alt={doc.filename ?? "Ticket photo"}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <TicketMessageForm ticketId={ticket.id} />
          </div>
        </div>

        <WorkOrderPanel
          ticketId={ticket.id}
          workOrders={workOrders}
          contractors={contractors.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </div>
  );
}
