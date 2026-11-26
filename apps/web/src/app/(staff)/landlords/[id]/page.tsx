import Link from "next/link";
import { notFound } from "next/navigation";
import { getLandlordById } from "@/lib/db/queries";
import { getLandlordOverview, type PortalStatus } from "@/lib/db/queries/portfolio";
import { listActivity } from "@/lib/db/queries/activity";
import { ActivityList } from "@/components/admin/activity-list";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { LandlordForm } from "@/components/admin/landlord-form";
import { LandlordInviteButton } from "@/components/admin/landlord-invite-button";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatGrid,
  StatPill,
  StatusBadge,
} from "@/components/admin/admin-page";
import { displayPersonName } from "@/lib/person-name";
import { statementAdminPath } from "@/lib/finance/statement-format";
import { formatDay, formatDayRange, formatMoney, humanize } from "@/lib/utils";

const PORTAL_TEXT: Record<PortalStatus, string> = {
  active: "Using the portal",
  invited: "Invited, not signed in yet",
  none: "Not invited",
};

const SERVICE_LEVEL: Record<string, string> = {
  let_only: "Let only",
  rent_collection: "Rent collection",
  fully_managed: "Fully managed",
};

export default async function LandlordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const landlord = await getLandlordById(id);
  if (!landlord) notFound();
  const [overview, activity] = await Promise.all([
    getLandlordOverview(id),
    listActivity({ entityId: id }, 20),
  ]);
  const name = displayPersonName(landlord.firstName, landlord.lastName);
  const letCount = overview.properties.filter((p) => p.tenancyId).length;
  const monthlyRent = overview.properties.reduce((sum, p) => sum + Number(p.tenancyRent ?? 0), 0);
  const lastPayout = overview.payouts[0];

  return (
    <div>
      <AdminPageHeader
        title={name}
        description={[
          SERVICE_LEVEL[landlord.serviceLevel ?? "fully_managed"] ?? humanize(landlord.serviceLevel),
          landlord.feePercent ? `${Number(landlord.feePercent)}% management fee` : null,
          landlord.prsRegistrationNumber ? `Register no. ${landlord.prsRegistrationNumber}` : "No register number yet",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Link href="/landlords" className="text-sm text-primary hover:underline">
              All landlords
            </Link>
            <AdminEntityDialog triggerLabel="Edit details" title="Edit landlord" triggerVariant="outline" triggerSize="sm">
              <LandlordForm
                compact
                initial={{
                  id: landlord.id,
                  firstName: landlord.firstName,
                  lastName: landlord.lastName,
                  email: landlord.email,
                  phone: landlord.phone,
                  notes: landlord.notes,
                  prsRegistrationNumber: landlord.prsRegistrationNumber,
                  serviceLevel: landlord.serviceLevel,
                  feePercent: landlord.feePercent,
                  lettingFee: landlord.lettingFee,
                  nrlStatus: landlord.nrlStatus,
                  nrlApprovalRef: landlord.nrlApprovalRef,
                }}
              />
            </AdminEntityDialog>
            {landlord.email && <LandlordInviteButton landlordId={landlord.id} />}
          </>
        }
      />

      <StatGrid>
        <StatPill label="Properties" value={overview.properties.length} hint={`${letCount} let`} />
        <StatPill label="Rent a month" value={formatMoney(monthlyRent, { pence: false })} hint="Current tenancies" />
        <StatPill
          label="Owed now"
          value={formatMoney(Math.max(0, overview.balance))}
          hint={overview.balance < -0.004 ? `Owes you ${formatMoney(-overview.balance)}` : "Paid on month end"}
          tone={overview.balance > 0.004 ? "warning" : "neutral"}
          href={overview.balance > 0.004 ? "/finance/payouts" : undefined}
        />
        <StatPill
          label="Last payout"
          value={lastPayout ? formatMoney(lastPayout.amount) : "—"}
          hint={lastPayout ? formatDay(lastPayout.paidAt) : "None yet"}
        />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminSection title="Properties" className="mt-0">
            {overview.properties.length ? (
              <AdminTable headers={["Property", "Tenant", "Rent", "Repairs", "Status"]}>
                {overview.properties.map(({ property, tenancyId, renterFirstName, renterLastName, tenancyRent, openRepairs }) => (
                  <tr key={property.id} className="row-link">
                    <td className="px-4 py-3">
                      <Link href={`/properties/${property.id}`} className="row-link-main">
                        {property.displayAddress}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {tenancyId ? (
                        <Link href={`/tenancies/${tenancyId}`} className="hover:underline">
                          {displayPersonName(renterFirstName ?? "", renterLastName ?? "")}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Empty</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {tenancyRent ? formatMoney(tenancyRent, { pence: false }) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {openRepairs ? (
                        <Link href={`/properties/${property.id}?tab=repairs`} className="text-amber-700 hover:underline">
                          {openRepairs} open
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={property.status} />
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <AdminEmptyState
                title="No properties yet"
                description="Pick this landlord on a property's Basic information step to link it."
              />
            )}
          </AdminSection>

          <AdminSection title="Money" description="Latest lines on the landlord's account, newest first.">
            {overview.ledger.length ? (
              <AdminTable headers={["Date", "What", "Amount"]}>
                {overview.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDay(e.occurredAt)}</td>
                    <td className="px-4 py-2.5">{e.memo || humanize(e.entryType)}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${Number(e.amount) < 0 ? "text-muted-foreground" : ""}`}
                    >
                      {formatMoney(e.amount)}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <AdminEmptyState title="Nothing on the account yet" />
            )}
          </AdminSection>

          <AdminSection title="Statements">
            {overview.statements.length ? (
              <ul className="divide-y rounded-xl border bg-card">
                {overview.statements.map(({ statement }) => (
                  <li key={statement.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <Link href={statementAdminPath(statement.id)} className="font-medium hover:underline">
                      {formatDayRange(statement.periodFrom, statement.periodTo)}
                    </Link>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      Net {formatMoney((statement.totals as { net?: number })?.net ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminEmptyState title="No statements yet" description="They're made on Month end." />
            )}
          </AdminSection>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Contact</h2>
            <div className="mt-2 space-y-1 text-sm">
              {landlord.email ? <CopyTextButton value={landlord.email} /> : <p className="text-muted-foreground">No email</p>}
              {landlord.phone ? <CopyTextButton value={landlord.phone} /> : <p className="text-muted-foreground">No phone</p>}
            </div>
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Portal: </span>
              {PORTAL_TEXT[overview.portal]}
            </p>
            {landlord.notes && (
              <p className="mt-3 whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">{landlord.notes}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Payouts</h2>
            {overview.payouts.length ? (
              <ul className="mt-2 divide-y text-sm">
                {overview.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <span className="text-muted-foreground">{formatDay(p.paidAt)}</span>
                    <span className="tabular-nums">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No payouts yet.</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Activity</h2>
            <ActivityList entries={activity} />
          </section>
        </div>
      </div>
    </div>
  );
}
