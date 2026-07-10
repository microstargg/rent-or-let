import Link from "next/link";
import {
  countProperties,
  countByStatus,
  countOpenTickets,
  countOverdueInvoices,
  getDefaultBranch,
  countComplianceIssues,
} from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const branch = await getDefaultBranch();
  const branchId = branch?.id;

  const [
    totalProperties,
    newEnquiries,
    pendingApplications,
    openComplaints,
    failedSyncs,
    openTickets,
    overdueInvoices,
    complianceIssues,
  ] = await Promise.all([
    countProperties(),
    countByStatus("enquiries", "new"),
    countByStatus("tenant_applications", "submitted"),
    countByStatus("complaints", "open"),
    countByStatus("portal_sync_logs", "failed"),
    branchId ? countOpenTickets(branchId) : 0,
    branchId ? countOverdueInvoices(branchId) : 0,
    branchId ? countComplianceIssues(branchId) : 0,
  ]);

  const stats = [
    { label: "Total properties", value: totalProperties, href: "/admin/properties" },
    { label: "New enquiries", value: newEnquiries, href: "/admin/enquiries" },
    { label: "Pending applications", value: pendingApplications, href: "/admin/applications" },
    { label: "Open complaints", value: openComplaints, href: "/admin/complaints" },
    { label: "Open tickets", value: openTickets, href: "/admin/tickets" },
    { label: "Overdue invoices", value: overdueInvoices, href: "/admin/finance/arrears" },
    { label: "Compliance issues", value: complianceIssues, href: "/admin/compliance" },
    { label: "Failed portal syncs", value: failedSyncs, href: "/admin/portals" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Property Management Services admin</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, href }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link href={href}>View</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/properties/new">Add new property</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/tenancies">Create tenancy</Link>
        </Button>
      </div>
    </div>
  );
}
