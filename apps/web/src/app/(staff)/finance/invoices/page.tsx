import Link from "next/link";
import { listInvoices, getDefaultBranch, allocatedTotalsForInvoices } from "@/lib/db/queries";
import { InvoiceMarkPaid } from "@/components/admin/invoice-mark-paid";
import { displayPersonName } from "@/lib/person-name";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination, PAGE_SIZE, listBaseHref } from "@/components/admin/admin-pagination";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatGrid,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { formatMoney, formatDay } from "@/lib/utils";
import {
  invoiceTypeLabel,
  isTenantPayableInvoiceType,
  isWorksInvoiceType,
} from "@/lib/operations/maintenance/constants";
import { LATE_RENT_MIN_DAYS } from "@/lib/finance/late-interest";
import { RaiseRentButton } from "@/components/admin/raise-rent-button";

const FILTERS = [
  { value: "to_collect", label: "To collect" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "partial", label: "Part paid" },
  { value: "paid", label: "Paid" },
  { value: "works", label: "Works" },
] as const;

type Filter = (typeof FILTERS)[number]["value"] | "all";

function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function monthLabel(ym: string) {
  return new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; month?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = ((FILTERS.some((f) => f.value === sp.status) || sp.status === "all"
    ? sp.status
    : "to_collect") ?? "to_collect") as Filter;
  const q = (sp.q ?? "").trim().toLowerCase();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const branch = await getDefaultBranch();
  const rows = await listInvoices(branch?.id);
  const today = londonToday();
  const overdueBefore = addDays(today, -LATE_RENT_MIN_DAYS);

  const isOpenRent = (r: (typeof rows)[number]) =>
    isTenantPayableInvoiceType(r.invoice.type) &&
    (r.invoice.status === "due" || r.invoice.status === "partial");

  const matchesFilter = (r: (typeof rows)[number], f: Filter) => {
    const due = String(r.invoice.dueDate);
    switch (f) {
      case "to_collect":
        return isOpenRent(r) && due <= today;
      case "overdue":
        return isOpenRent(r) && due < overdueBefore;
      case "upcoming":
        return isOpenRent(r) && due > today;
      case "partial":
        return r.invoice.status === "partial";
      case "paid":
        return r.invoice.status === "paid";
      case "works":
        return isWorksInvoiceType(r.invoice.type);
      default:
        return true;
    }
  };

  const toCollect = rows.filter((r) => matchesFilter(r, "to_collect"));
  const overdue = rows.filter((r) => matchesFilter(r, "overdue"));
  const pendingWorks = rows.filter(
    (r) => isWorksInvoiceType(r.invoice.type) && r.invoice.status === "pending_statement"
  );

  const partialIds = rows.filter((r) => r.invoice.status === "partial").map((r) => r.invoice.id);
  const paidSoFar = await allocatedTotalsForInvoices(partialIds);
  const outstandingOf = (r: (typeof rows)[number]) =>
    Math.max(0, Number(r.invoice.amount) - (paidSoFar.get(r.invoice.id) ?? 0));
  const sumOutstanding = (list: typeof rows) => list.reduce((s, r) => s + outstandingOf(r), 0);

  const months = Array.from(new Set(rows.map((r) => String(r.invoice.dueDate).slice(0, 7)))).sort().reverse();

  const partyOf = (r: (typeof rows)[number]) =>
    isWorksInvoiceType(r.invoice.type)
      ? r.landlordFirstName || r.landlordLastName
        ? `Landlord · ${displayPersonName(r.landlordFirstName ?? "", r.landlordLastName ?? "")}`
        : "Landlord"
      : displayPersonName(r.renterFirstName ?? "", r.renterLastName ?? "");

  const filtered = rows.filter((r) => {
    if (!matchesFilter(r, filter)) return false;
    if (month && !String(r.invoice.dueDate).startsWith(month)) return false;
    if (q) {
      const hay = [r.propertyAddress, partyOf(r), invoiceTypeLabel(r.invoice.type, r.invoice.meta)]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  // Money to collect reads oldest first; history reads newest first.
  if (filter === "to_collect" || filter === "overdue" || filter === "upcoming") {
    filtered.sort((a, b) => String(a.invoice.dueDate).localeCompare(String(b.invoice.dueDate)));
  }
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterHref = (status: string) => listBaseHref("/finance/invoices", { status, month, q: sp.q });

  return (
    <div>
      <AdminPageHeader
        title="Invoices"
        description="Rent charges for tenants, and works invoices from finished jobs. Rent is raised on the 1st for the next month."
        actions={<RaiseRentButton />}
      />
      <FinanceSubnav />

      <StatGrid columns={3}>
        <StatPill
          label="To collect"
          value={toCollect.length}
          hint={formatMoney(sumOutstanding(toCollect))}
          tone={toCollect.length ? "warning" : "success"}
          href={filterHref("to_collect")}
          active={filter === "to_collect"}
        />
        <StatPill
          label="Overdue"
          value={overdue.length}
          hint={`${LATE_RENT_MIN_DAYS}+ days · ${formatMoney(sumOutstanding(overdue))}`}
          tone={overdue.length ? "danger" : "neutral"}
          href={filterHref("overdue")}
          active={filter === "overdue"}
        />
        <StatPill
          label="Works awaiting statement"
          value={pendingWorks.length}
          tone={pendingWorks.length ? "warning" : "neutral"}
          href={filterHref("works")}
          active={filter === "works"}
        />
      </StatGrid>

      <AdminSection title={FILTERS.find((f) => f.value === filter)?.label ?? "All invoices"}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <AdminListToolbar
              searchPlaceholder="Search address, tenant or landlord"
              statusOptions={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              defaultStatus="to_collect"
            />
          </div>
          <form method="get" className="flex items-center gap-2">
            {filter !== "to_collect" && <input type="hidden" name="status" value={filter} />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <label htmlFor="month" className="sr-only">
              Month due
            </label>
            <select
              id="month"
              name="month"
              defaultValue={month}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Any month</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
              Show
            </button>
          </form>
        </div>

        {pageRows.length ? (
          <div className="mt-3">
            <AdminTable headers={["Charge", "Property / who", "Due", "Status", ""]}>
              {pageRows.map((r) => {
                const { invoice, propertyAddress } = r;
                const works = isWorksInvoiceType(invoice.type);
                const ticketId =
                  invoice.meta &&
                  typeof invoice.meta === "object" &&
                  typeof (invoice.meta as { ticket_id?: unknown }).ticket_id === "string"
                    ? (invoice.meta as { ticket_id: string }).ticket_id
                    : null;
                const href = works
                  ? ticketId
                    ? `/tickets/${ticketId}`
                    : null
                  : invoice.tenancyId
                    ? `/tenancies/${invoice.tenancyId}?tab=money`
                    : null;
                const owed = outstandingOf(r);
                const late = isOpenRent(r) && String(invoice.dueDate) < overdueBefore;

                return (
                  <tr key={invoice.id} className={href ? "row-link align-top" : "align-top"}>
                    <td className="px-4 py-3">
                      {href ? (
                        <Link href={href} className="row-link-main">
                          {invoiceTypeLabel(invoice.type, invoice.meta)}
                        </Link>
                      ) : (
                        <p className="font-medium">{invoiceTypeLabel(invoice.type, invoice.meta)}</p>
                      )}
                      <p className="tabular-nums text-muted-foreground">
                        {formatMoney(Number(invoice.amount))}
                        {invoice.status === "partial" && ` · ${formatMoney(owed)} left`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{propertyAddress ?? "—"}</p>
                      <p className="text-muted-foreground">{partyOf(r)}</p>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 ${late ? "text-red-700" : "text-muted-foreground"}`}>
                      {formatDay(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {works ? (
                        !ticketId && <span className="text-sm text-muted-foreground">On landlord statement</span>
                      ) : (
                        (invoice.status === "due" || invoice.status === "partial") && (
                          <InvoiceMarkPaid id={invoice.id} status={invoice.status} outstanding={owed} />
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </AdminTable>
            <AdminPagination
              page={page}
              total={filtered.length}
              baseHref={listBaseHref("/finance/invoices", { status: sp.status, month, q: sp.q })}
            />
          </div>
        ) : (
          <AdminEmptyState
            title={rows.length ? "Nothing matches" : "No invoices yet"}
            description={
              rows.length
                ? filter === "to_collect"
                  ? "No rent is waiting to be collected. Try Upcoming or All."
                  : "Try another filter or month."
                : "Rent invoices are raised on the 1st. Finished jobs add works invoices."
            }
          />
        )}
      </AdminSection>
    </div>
  );
}
