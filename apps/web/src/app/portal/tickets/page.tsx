import Link from "next/link";
import { listTicketsForRenter } from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { AdminEmptyState, AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";

export default async function PortalTicketsPage() {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { branchId, renterId } = ctx.profile.profile;
  const tickets = await listTicketsForRenter(branchId, renterId);

  return (
    <div>
      <AdminPageHeader
        title="Maintenance"
        description="Report a repair and follow its progress"
        actions={
          <Button asChild>
            <Link href="/portal/tickets/new">Report a repair</Link>
          </Button>
        }
      />

      <div className="mt-8 space-y-3">
        {tickets.map(({ ticket, propertyAddress }) => (
          <Link
            key={ticket.id}
            href={`/portal/tickets/${ticket.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-muted/50"
          >
            <div className="min-w-0">
              <h2 className="font-semibold">{ticket.summary}</h2>
              <p className="text-sm text-muted-foreground">
                {propertyAddress} · reported {formatDate(ticket.createdAt)}
              </p>
            </div>
            <StatusBadge status={ticket.status} />
          </Link>
        ))}
        {!tickets.length && (
          <AdminEmptyState
            title="No repairs reported"
            description="If something needs fixing, report it and your agent will be in touch."
          />
        )}
      </div>
    </div>
  );
}
