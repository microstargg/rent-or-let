import Link from "next/link";
import {
  getActiveTenancyForRenter,
  listInvoicesForRenter,
  listTicketsForRenter,
} from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalDashboardPage() {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { branchId, renterId } = ctx.profile.profile;
  const [tenancy, invoices, tickets] = await Promise.all([
    getActiveTenancyForRenter(renterId, branchId),
    listInvoicesForRenter(branchId, renterId),
    listTicketsForRenter(branchId, renterId),
  ]);

  const dueInvoices = invoices.filter((r) => r.invoice.status === "due");
  const openTickets = tickets.filter(
    (t) => !["completed", "cancelled"].includes(t.ticket.status)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {tenancy ? (
        <p className="mt-1 text-muted-foreground">
          Active tenancy · £{Number(tenancy.rentAmount).toFixed(2)}/month
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground">No active tenancy</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dueInvoices.length}</p>
            <Link href="/portal/rent" className="mt-2 text-sm text-primary underline">
              View rent
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openTickets.length}</p>
            <Link href="/portal/tickets" className="mt-2 text-sm text-primary underline">
              View tickets
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
