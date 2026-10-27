import Link from "next/link";
import {
  getActiveTenancyForRenter,
  listInvoicesForRenter,
  listTicketsForRenter,
} from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { formatMoney } from "@/lib/portal-format";

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
      <AdminPageHeader
        title={`Welcome, ${ctx.profile.renter.firstName}`}
        description={
          tenancy
            ? `Active tenancy · ${formatMoney(tenancy.rentAmount)} a month`
            : "No active tenancy"
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dueInvoices.length}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/portal/rent">View rent</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open repairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openTickets.length}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/portal/tickets">View maintenance</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
