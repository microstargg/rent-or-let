import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketForRenter, listTicketMessages } from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { PortalTicketMessageForm } from "@/components/portal/portal-ticket-message-form";

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { id } = await params;
  const { branchId, renterId } = ctx.profile.profile;
  const ticket = await getTicketForRenter(id, branchId, renterId);
  if (!ticket) notFound();

  const messages = await listTicketMessages(id);

  return (
    <div>
      <Link href="/portal/tickets" className="text-sm text-muted-foreground hover:underline">
        ← Tickets
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{ticket.summary}</h1>
      <p className="text-muted-foreground">{ticket.status}</p>
      {ticket.description && <p className="mt-4 text-sm">{ticket.description}</p>}

      <div className="mt-8 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground">{m.senderType}</p>
            <p className="mt-1">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-lg">
        <PortalTicketMessageForm ticketId={id} />
      </div>
    </div>
  );
}
