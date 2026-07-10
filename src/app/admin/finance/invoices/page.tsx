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

export default async function AdminInvoicesPage() {
  const branch = await getDefaultBranch();
  const rows = await listInvoices(branch?.id);
  const open = rows.filter((r) => r.invoice.status === "due" || r.invoice.status === "partial");
  const openTotal = open.reduce((sum, r) => sum + Number(r.invoice.amount), 0);

  return (
    <div>
      <AdminPageHeader
        title="Invoices"
        description="Rent and fee charges. Record full or partial payments, then chase what’s left from Arrears."
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Total invoices" value={rows.length} />
        <StatPill label="Open" value={open.length} tone={open.length ? "warning" : "success"} />
        <StatPill
          label="Open value"
          value={formatCurrency(openTotal)}
          tone={openTotal > 0 ? "warning" : "neutral"}
        />
      </div>

      <AdminSection title="All invoices" description="Newest due dates first">
        {rows.length ? (
          <AdminTable headers={["Charge", "Property / renter", "Due", "Status", "Actions"]}>
            {rows.map(({ invoice, propertyAddress, renterFirstName, renterLastName }) => (
              <tr key={invoice.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium capitalize">{invoice.type}</p>
                  <p className="text-muted-foreground">
                    £{Number(invoice.amount).toFixed(2)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{propertyAddress}</p>
                  <p className="text-muted-foreground">
                    {displayPersonName(renterFirstName, renterLastName)}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{invoice.dueDate}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3">
                  {(invoice.status === "due" || invoice.status === "partial") && (
                    <InvoiceMarkPaid id={invoice.id} status={invoice.status} />
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="No invoices yet"
            description="Monthly rent cron creates invoices for active tenancies, or generate them from operations."
          />
        )}
      </AdminSection>
    </div>
  );
}
