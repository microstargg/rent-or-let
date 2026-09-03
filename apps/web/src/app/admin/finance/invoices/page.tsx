import Link from "next/link";
import { listInvoices, getDefaultBranch } from "@/lib/db/queries";
import { InvoiceMarkPaid } from "@/components/admin/invoice-mark-paid";
import { displayPersonName } from "@/lib/person-name";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { formatCurrency } from "@/lib/utils";
import {
  invoiceTypeLabel,
  isTenantPayableInvoiceType,
  isWorksInvoiceType,
} from "@/lib/operations/maintenance/constants";
import { seedDemoWorkInvoices } from "@/lib/operations/maintenance/seed-demo-work-invoices";

export default async function AdminInvoicesPage() {
  const branch = await getDefaultBranch();
  if (branch) {
    try {
      await seedDemoWorkInvoices(branch.id);
    } catch (err) {
      console.error("[invoices] demo works seed failed", err);
    }
  }
  const rows = await listInvoices(branch?.id);
  const open = rows.filter(
    (r) =>
      isTenantPayableInvoiceType(r.invoice.type) &&
      (r.invoice.status === "due" || r.invoice.status === "partial")
  );
  const pendingWorks = rows.filter(
    (r) => isWorksInvoiceType(r.invoice.type) && r.invoice.status === "pending_statement"
  );
  const openTotal = open.reduce((sum, r) => sum + Number(r.invoice.amount), 0);

  return (
    <div>
      <AdminPageHeader
        title="Invoices"
        description="Rent charges for tenants, plus works invoices from completed jobs. Works are deducted from the landlord when you generate statements."
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Total invoices" value={rows.length} />
        <StatPill
          label="Open rent"
          value={open.length}
          hint={formatCurrency(openTotal)}
          tone={open.length ? "warning" : "success"}
        />
        <StatPill
          label="Works awaiting statement"
          value={pendingWorks.length}
          tone={pendingWorks.length ? "warning" : "neutral"}
        />
      </div>

      <AdminSection title="All invoices" description="Newest due dates first">
        {rows.length ? (
          <AdminTable headers={["Charge", "Property / party", "Due", "Status", "Actions"]}>
            {rows.map(
              ({
                invoice,
                propertyAddress,
                renterFirstName,
                renterLastName,
                landlordFirstName,
                landlordLastName,
              }) => {
                const works = isWorksInvoiceType(invoice.type);
                const ticketId =
                  invoice.meta &&
                  typeof invoice.meta === "object" &&
                  typeof (invoice.meta as { ticket_id?: unknown }).ticket_id === "string"
                    ? (invoice.meta as { ticket_id: string }).ticket_id
                    : null;
                const party = works
                  ? landlordFirstName || landlordLastName
                    ? `Landlord · ${displayPersonName(landlordFirstName ?? "", landlordLastName ?? "")}`
                    : "Landlord"
                  : displayPersonName(renterFirstName ?? "", renterLastName ?? "");

                return (
                  <tr key={invoice.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{invoiceTypeLabel(invoice.type)}</p>
                      <p className="text-muted-foreground">
                        £{Number(invoice.amount).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{propertyAddress ?? "—"}</p>
                      <p className="text-muted-foreground">{party}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.dueDate}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3">
                      {works ? (
                        ticketId ? (
                          <Link
                            href={`/admin/tickets/${ticketId}`}
                            className="text-sm text-primary underline-offset-4 hover:underline"
                          >
                            Open job
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">On landlord statement</span>
                        )
                      ) : (
                        (invoice.status === "due" || invoice.status === "partial") && (
                          <InvoiceMarkPaid id={invoice.id} status={invoice.status} />
                        )
                      )}
                    </td>
                  </tr>
                );
              }
            )}
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="No invoices yet"
            description="Monthly rent cron creates rent invoices. Completed jobs create works invoices dated to the work."
          />
        )}
      </AdminSection>
    </div>
  );
}
