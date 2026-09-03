import Link from "next/link";
import { listTicketsForRenter } from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";

export default async function PortalTicketsPage() {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { branchId, renterId } = ctx.profile.profile;
  const tickets = await listTicketsForRenter(branchId, renterId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="mt-1 text-muted-foreground">Maintenance requests</p>
        </div>
        <Button asChild>
          <Link href="/portal/tickets/new">New ticket</Link>
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {tickets.map(({ ticket, propertyAddress }) => (
          <Link
            key={ticket.id}
            href={`/portal/tickets/${ticket.id}`}
            className="block rounded-xl border p-4 hover:bg-muted/50"
          >
            <h2 className="font-semibold">{ticket.summary}</h2>
            <p className="text-sm text-muted-foreground">{propertyAddress}</p>
            <p className="mt-1 text-xs text-muted-foreground">{ticket.status}</p>
          </Link>
        ))}
        {!tickets.length && <p className="text-muted-foreground">No tickets yet</p>}
      </div>
    </div>
  );
}
