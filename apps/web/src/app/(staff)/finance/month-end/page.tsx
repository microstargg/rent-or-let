import Link from "next/link";
import { getDefaultBranch } from "@/lib/db/queries";
import { getMonthEndOverview, monthPeriod, shiftMonth } from "@/lib/db/queries/month-end";
import { getClientAccountCheck } from "@/lib/db/queries/client-account";
import { ClientAccountCheckForm } from "@/components/admin/client-account-check-form";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { StatementCsvImport } from "@/components/admin/statement-csv-import";
import { LandlordPayoutButton } from "@/components/admin/landlord-payout-button";
import {
  OutgoingLineActions,
  ReopenOutgoingButton,
} from "@/components/admin/outgoing-line-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTable,
  StatPill,
  StatusBadge,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { displayPersonName } from "@/lib/person-name";
import { formatCurrency, formatDate } from "@/lib/utils";

function Step({
  n,
  title,
  done,
  doneLabel = "Done",
  todoLabel = "To do",
  description,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  doneLabel?: string;
  todoLabel?: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              done ? "bg-green-600 text-white" : "bg-muted text-foreground"
            }`}
          >
            {done ? "✓" : n}
          </span>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <StatusBadge status={done ? doneLabel : todoLabel} tone={done ? "success" : "warning"} />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`)
  );
}

export default async function MonthEndPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const period = monthPeriod(params.month);
  const branch = await getDefaultBranch();
  if (!branch) {
    return <AdminEmptyState title="No branch" description="Set up a branch first." />;
  }
  const data = await getMonthEndOverview(branch.id, period);
  const account = await getClientAccountCheck(branch.id, period);
  // Re-work the difference from the saved bank balance so later fixes to the records show up.
  const difference =
    account.saved != null ? Math.round((account.saved.bank_balance - account.expected) * 100) / 100 : null;
  const balanced = difference != null && Math.abs(difference) < 0.01;
  const sameAsLast =
    difference != null &&
    !balanced &&
    account.previous != null &&
    Math.abs(difference - account.previous.difference) < 0.01;

  const today = new Date().toISOString().slice(0, 10);
  const coverTo = period.to < today ? period.to : today;
  const lastBookedIso = data.lastBooked?.toISOString().slice(0, 10) ?? null;
  const imported = Boolean(lastBookedIso && lastBookedIso >= coverTo);
  const unpaidRent = data.rent.filter((r) => r.outstanding > 0.005);

  const unmatchedPayouts = data.payouts.filter((p) => !p.bankTxnId);
  const unmatchedJobs = data.contractorPayments.filter((j) => !j.bankTxnId);
  const outgoingsChecked =
    data.payouts.length + data.contractorPayments.length > 0 &&
    unmatchedPayouts.length === 0 &&
    unmatchedJobs.length === 0 &&
    data.unexpected.length === 0;

  return (
    <div>
      <AdminPageHeader
        title="Month end"
        description="Check rent has landed, pay landlords, then check the payments you sent match what's recorded."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href={`/finance/month-end?month=${shiftMonth(period.month, -1)}`}>←</Link>
            </Button>
            <span className="min-w-[9rem] text-center font-medium">{monthLabel(period.month)}</span>
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href={`/finance/month-end?month=${shiftMonth(period.month, 1)}`}>→</Link>
            </Button>
          </div>
        }
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatPill label="Rent expected" value={formatCurrency(data.rentExpected)} />
        <StatPill
          label="Rent received"
          value={formatCurrency(data.rentReceived)}
          tone={data.rentReceived + 0.005 >= data.rentExpected ? "success" : "warning"}
        />
        <StatPill
          label="Still to pay landlords"
          value={formatCurrency(data.balances.reduce((s, b) => s + b.balance, 0))}
          tone={data.balances.length ? "warning" : "success"}
        />
        <StatPill
          label="Job margin"
          value={formatCurrency(data.jobMargin)}
          hint="Client charges minus contractor costs"
        />
      </div>

      <Step
        n={1}
        title="Check rent has come in"
        done={imported && unpaidRent.length === 0}
        doneLabel="All received"
        todoLabel={imported ? `${unpaidRent.length} unpaid` : "Import statement"}
        description="Upload the bank statement (PDF or CSV). Rent is matched to tenants by payment reference, and anything unpaid is listed below."
      >
        <p className="mb-3 text-sm">
          {lastBookedIso
            ? `Bank lines imported up to ${formatDate(lastBookedIso)}${imported ? "." : ` — import up to ${formatDate(coverTo)} to cover this month.`}`
            : "No bank statement imported yet."}
        </p>
        <StatementCsvImport title="Upload bank statement" />
        {unpaidRent.length > 0 && (
          <div className="mt-4">
            <AdminTable headers={["Property", "Renter", "Due", "Amount", "Outstanding"]}>
              {unpaidRent.map((r) => (
                <tr key={r.invoiceId}>
                  <td className="px-4 py-3 font-medium">{r.propertyAddress ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.renterFirstName ? displayPersonName(r.renterFirstName, r.renterLastName ?? "") : "—"}
                  </td>
                  <td className="px-4 py-3">{formatDate(r.dueDate)}</td>
                  <td className="px-4 py-3">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{formatCurrency(r.outstanding)}</td>
                </tr>
              ))}
            </AdminTable>
            <p className="mt-2 text-sm text-muted-foreground">
              Chase these from{" "}
              <Link href="/finance/arrears" className="text-primary underline">
                Arrears
              </Link>
              . Late payments go into next month&apos;s payout automatically.
            </p>
          </div>
        )}
      </Step>

      <Step
        n={2}
        title="Clear payment exceptions"
        done={data.openExceptions === 0}
        doneLabel="Clear"
        todoLabel={`${data.openExceptions} open`}
        description="Money that came in but couldn't be matched to a tenant. Sort these out before paying landlords so nobody is short."
      >
        {data.openExceptions > 0 ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/finance/exceptions">Review {data.openExceptions} exception(s)</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing waiting.</p>
        )}
      </Step>

      <Step
        n={3}
        title="Pay landlords"
        done={data.balances.length === 0}
        doneLabel="All paid"
        todoLabel={`${data.balances.length} to pay`}
        description="Each balance is rent actually received, minus your fees and job charges at the client price. Pay from your bank, then mark it paid here."
      >
        {data.balances.length ? (
          <AdminTable headers={["Landlord", "Balance", ""]}>
            {data.balances.map((b) => (
              <tr key={b.landlordId}>
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{formatCurrency(b.balance)}</td>
                <td className="px-4 py-3 text-right">
                  <LandlordPayoutButton landlordId={b.landlordId} />
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-muted-foreground">No landlord balances outstanding.</p>
        )}
      </Step>

      <Step
        n={4}
        title="Check payments out (optional)"
        done={outgoingsChecked}
        doneLabel="All checked"
        todoLabel={
          data.payouts.length + data.contractorPayments.length + data.unexpected.length
            ? `${unmatchedPayouts.length + unmatchedJobs.length + data.unexpected.length} to check`
            : "Nothing yet"
        }
        description="After paying, upload the statement again. Each payment out is matched to a landlord payout or contractor job; anything missing, a different amount or unexpected is listed here."
      >
        <StatementCsvImport
          title="Upload statement again"
          description="Export the same account again after you've paid. Lines from the first upload are skipped automatically."
        />

        <h3 className="mt-5 text-sm font-semibold">Landlord payouts this month</h3>
        {data.payouts.length ? (
          <AdminTable headers={["Landlord", "Recorded", "Amount", "In bank"]}>
            {data.payouts.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{displayPersonName(p.firstName, p.lastName)}</td>
                <td className="px-4 py-3">{formatDate(p.paidAt)}</td>
                <td className="px-4 py-3">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3">
                  {p.bankTxnId ? (
                    <StatusBadge status={`Seen ${formatDate(p.bankBookedAt!)}`} tone="success" />
                  ) : (
                    <StatusBadge status="Not found" tone="danger" />
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-muted-foreground">No payouts recorded this month.</p>
        )}

        <h3 className="mt-5 text-sm font-semibold">Contractor payments for jobs this month</h3>
        {data.contractorPayments.length ? (
          <AdminTable headers={["Job", "Contractor cost", "Client charge", "In bank"]}>
            {data.contractorPayments.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-3">
                  <Link href={`/tickets/${j.ticketId}`} className="font-medium text-primary">
                    {j.contractorName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{j.summary}</p>
                </td>
                <td className="px-4 py-3">{formatCurrency(j.cost)}</td>
                <td className="px-4 py-3">
                  {formatCurrency(j.charge)}
                  {j.charge !== j.cost && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (+{formatCurrency(j.charge - j.cost)})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {j.bankTxnId ? (
                    <StatusBadge status={`Seen ${formatDate(j.bankBookedAt!)}`} tone="success" />
                  ) : (
                    <StatusBadge status="Not paid yet" tone="warning" />
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-muted-foreground">No completed contractor jobs this month.</p>
        )}

        <h3 className="mt-5 text-sm font-semibold">Payments out we didn&apos;t expect</h3>
        {data.unexpected.length ? (
          <div className="space-y-3">
            {data.unexpected.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">{t.description || "Bank payment"}</span>
                  <span>
                    {formatDate(t.bookedAt)} ·{" "}
                    <span className="font-semibold text-red-700">{formatCurrency(Math.abs(t.amount))}</span>
                  </span>
                </div>
                <div className="mt-2">
                  <OutgoingLineActions transactionId={t.id} amount={t.amount} linkable={data.linkable} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None.</p>
        )}

        {data.markedExpected.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">Marked as expected</h3>
            <AdminTable headers={["Payment", "Date", "Amount", "Note", ""]}>
              {data.markedExpected.map((t) => {
                const raw = (t.raw ?? {}) as { resolved_note?: string };
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3">{t.description || "Bank payment"}</td>
                    <td className="px-4 py-3">{formatDate(t.bookedAt)}</td>
                    <td className="px-4 py-3">{formatCurrency(Math.abs(t.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{raw.resolved_note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <ReopenOutgoingButton transactionId={t.id} />
                    </td>
                  </tr>
                );
              })}
            </AdminTable>
          </>
        )}
      </Step>

      <Step
        n={5}
        title="Send landlord statements"
        done={data.statementCount > 0}
        doneLabel={`${data.statementCount} issued`}
        todoLabel="Not generated"
        description="Generate statements for the month from the ledger and send them to landlords."
      >
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/finance/statements">
            {data.statementCount ? "View statements" : "Generate statements"}
          </Link>
        </Button>
      </Step>

      <Step
        n={6}
        title="Check the client account balance"
        done={balanced || sameAsLast}
        doneLabel={balanced ? "Balanced" : "Same as last month"}
        todoLabel={difference == null ? "Not checked" : `Out by ${formatCurrency(Math.abs(difference))}`}
        description="Enter the closing balance from your bank statement. It should equal what the records say you're holding. Deposits are held by the deposit schemes, so they're not included."
      >
        <ClientAccountCheckForm
          month={period.month}
          periodEndLabel={formatDate(period.to)}
          initialBalance={account.saved?.bank_balance ?? account.suggestedBalance}
        />
        {account.saved == null && account.suggestedBalance != null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Filled in from the Balance column of your last statement upload. Check it matches the statement.
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {account.lines.map((l) => (
                <tr key={l.label} className="border-b last:border-0">
                  <td className="px-4 py-2">{l.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(l.amount)}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="px-4 py-2">Should be in the bank</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(account.expected)}</td>
              </tr>
              {account.saved && (
                <>
                  <tr>
                    <td className="px-4 py-2">Actually in the bank</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(account.saved.bank_balance)}
                    </td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-4 py-2">Difference</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${balanced ? "text-green-700" : "text-red-700"}`}
                    >
                      {formatCurrency(difference ?? 0)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {difference != null && !balanced && (
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            {sameAsLast ? (
              <p>
                Same difference as last month, so nothing new has gone wrong. This is usually money
                from before you started using the system. Add a landlord adjustment or a note to clear it.
              </p>
            ) : (
              account.previous && (
                <p>
                  Last month the difference was {formatCurrency(account.previous.difference)}, so{" "}
                  {formatCurrency(difference - account.previous.difference)} of it is new this month.
                </p>
              )
            )}
            {account.unexplainedOut > 0 && (
              <p>
                {formatCurrency(account.unexplainedOut)} of payments out haven&apos;t been explained
                yet (step 4). Link or mark them, then check again.
              </p>
            )}
            {difference > 0 && <p>More in the bank than expected: often money in that hasn&apos;t been imported yet.</p>}
            {difference < 0 && <p>Less in the bank than expected: often a payment out not yet uploaded, or rent recorded by hand that never arrived.</p>}
          </div>
        )}
      </Step>
    </div>
  );
}
