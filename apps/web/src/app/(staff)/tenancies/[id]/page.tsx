import Link from "next/link";
import { notFound } from "next/navigation";
import { getBranchWithSettings, getDefaultBranch, listRenters } from "@/lib/db/queries";
import { getTenancyDetail } from "@/lib/db/queries/tenancy";
import { AdminPageHeader, AdminSection, AdminTable, StatusBadge } from "@/components/admin/admin-page";
import { PropertyTabs, type PropertyTab, type PropertySummaryCard } from "@/components/admin/property-tabs";
import { TenancyMoreMenu } from "@/components/admin/tenancy-more-menu";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { RenterForm } from "@/components/admin/renter-form";
import { getTenancyLedger, rentersOnLiveTenancies } from "@/lib/db/queries/portfolio";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";
import { CopyPaymentRef } from "@/components/admin/copy-payment-ref";
import {
  TenancyArrearsPanel,
  TenancyCreditPanel,
  TenancyAgreementPanel,
  TenancyDepositPanel,
  TenancyNoticesPanel,
  TenancyPeoplePanel,
  TenancyRentSchedulePanel,
} from "@/components/admin/tenancy-detail-panels";
import {
  londonToday,
  nextRentDueOnOrAfter,
  parseRentSchedule,
  rentFrequencyName,
  rentPeriodLabel,
} from "@/lib/finance/rent-schedule";
import { displayPersonName } from "@/lib/person-name";
import { formatCurrency, formatDay, formatMoney } from "@/lib/utils";
import { SECTION_8_GROUNDS } from "@/lib/tenancy/section8";
import { AGREEMENT_EVENT_LABELS } from "@/lib/tenancy/agreement";
import { planProgress } from "@/lib/finance/arrears";
import { listActivity } from "@/lib/db/queries/activity";
import { getInspectionMeters } from "@/lib/db/queries/tenancy";
import { UtilityNoticePanel } from "@/components/admin/utility-notice-panel";
import { parseUtilityContacts, parseUtilityNotices } from "@/lib/tenancy/utility-notices";
import { ActivityList } from "@/components/admin/activity-list";
import { getOpeningBalance, getTenancyCredit } from "@/lib/db/queries/tenant-credit";
import { listOpenTenancyInvoices } from "@/lib/db/queries/finance";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function TenancyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; serve?: string }>;
}) {
  const { id } = await params;
  const { tab, serve } = await searchParams;
  const detail = await getTenancyDetail(id);
  if (!detail) notFound();
  const branch = await getDefaultBranch();
  const [renters, activity, moveIn, moveOut, branchSettings, credit, opening, openInvoices, ledger, busyRenters] = await Promise.all([
    listRenters(branch?.id),
    listActivity({ tenancyId: id }, 40),
    getInspectionMeters(id, "move_in"),
    getInspectionMeters(id, "move_out"),
    branch ? getBranchWithSettings(branch.id) : null,
    getTenancyCredit(id),
    getOpeningBalance(id),
    listOpenTenancyInvoices(id),
    getTenancyLedger(id),
    rentersOnLiveTenancies(id),
  ]);
  const { tenancy, property, renter, landlord } = detail;

  const tenants = [
    { partyId: null as string | null, renter },
    ...detail.jointTenants.map((j) => ({ partyId: j.partyId as string | null, renter: j.renter })),
  ].map(({ partyId, renter: r }) => ({
    partyId,
    renterId: r.id,
    name: displayPersonName(r.firstName, r.lastName),
    email: r.email,
    rtrCheckedAt: r.rtrCheckedAt,
    rtrMethod: r.rtrMethod,
    rtrExpiresAt: r.rtrExpiresAt,
  }));
  const onTenancy = new Set(tenants.map((t) => t.renterId));

  const ended = tenancy.status === "ended";
  const endingSoon = Boolean(
    tenancy.endDate && new Date(`${tenancy.endDate}T12:00:00Z`).getTime() - Date.now() < 60 * 86400000
  );
  // Deductions only matter at the end, so the form waits until then.
  const depositReturnRelevant = ended || endingSoon || Boolean(detail.depositReturn);
  const rtrMissing = tenants.filter((t) => !t.rtrCheckedAt);
  const signed = detail.agreements.some((a) => a.agreement.status === "completed");
  const paymentRef = getPaymentRefFromMetadata(tenancy.metadata);
  const newestFirst = [...ledger].reverse();
  const schedule = parseRentSchedule(tenancy);
  const nextRentDue = nextRentDueOnOrAfter(schedule, tenancy.startDate, londonToday());

  const attention: Array<{ text: string; tab: string }> = [];
  if (detail.overdue > 0.004) attention.push({ text: `${formatMoney(detail.overdue)} rent overdue`, tab: "money" });
  if (rtrMissing.length)
    attention.push({ text: `Right to Rent not recorded for ${rtrMissing.map((t) => t.name).join(", ")}`, tab: "people" });
  if (tenancy.depositAmount && !tenancy.depositProtectionRef)
    attention.push({ text: "Deposit not recorded as protected", tab: "deposit" });
  if (!signed && !ended) attention.push({ text: "No signed tenancy agreement on file", tab: "agreement" });
  if (endingSoon && !ended && tenancy.endDate)
    attention.push({ text: `Fixed term ends ${formatDay(tenancy.endDate)}`, tab: "move" });

  const summary: PropertySummaryCard[] = [
    { label: "Rent", value: formatCurrency(Number(tenancy.rentAmount)), hint: `${rentFrequencyName(tenancy.rentFrequency)}${paymentRef ? ` · ref ${paymentRef}` : ""}`, tone: "neutral", tab: "money" },
    {
      label: "Overdue",
      value: formatCurrency(detail.overdue),
      hint: credit > 0 ? `${formatCurrency(credit)} credit held` : detail.paymentPlan ? "Payment plan agreed" : undefined,
      tone: detail.overdue > 0.004 ? "danger" : "success",
      tab: "money",
    },
    {
      label: "Deposit",
      value: tenancy.depositAmount ? formatCurrency(Number(tenancy.depositAmount)) : "None",
      hint: tenancy.depositProtectionRef ? `${tenancy.depositScheme} ${tenancy.depositProtectionRef}` : tenancy.depositAmount ? "Not protected" : undefined,
      tone: tenancy.depositAmount && !tenancy.depositProtectionRef ? "warning" : "neutral",
      tab: "deposit",
    },
    {
      label: "Agreement",
      value: signed ? "Signed" : detail.agreements.length ? "Waiting to sign" : "Not sent",
      tone: signed ? "success" : ended ? "neutral" : "warning",
      tab: "agreement",
    },
  ];

  const tabs: PropertyTab[] = [
    {
      id: "overview",
      label: "Overview",
      count: attention.length,
      countTone: "warning",
      content: (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold">Needs attention</h3>
              {attention.length ? (
                <ul className="mt-2 divide-y text-sm">
                  {attention.map((a) => (
                    <li key={a.text} className="flex items-center justify-between gap-3 py-2">
                      <span>{a.text}</span>
                      <a href={`?tab=${a.tab}`} className="shrink-0 text-primary hover:underline">
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nothing to chase on this tenancy.</p>
              )}
            </section>
            <section className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold">Latest on the rent account</h3>
              {newestFirst.length ? (
                <ul className="mt-2 divide-y text-sm">
                  {newestFirst.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 py-2">
                      <span>
                        <span className="text-muted-foreground">{formatDay(l.dueDate ?? l.date)}</span> {l.description}
                      </span>
                      <span className={`tabular-nums ${l.paid ? "text-emerald-700" : ""}`}>
                        {l.paid ? `−${formatMoney(l.paid)}` : formatMoney(l.charge)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nothing charged yet.</p>
              )}
              <a href="?tab=money" className="mt-2 inline-block text-sm text-primary hover:underline">
                Full rent account
              </a>
            </section>
          </div>
          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Tenancy</h3>
            <dl className="mt-2 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
              <Fact label="Tenants">{tenants.map((t) => t.name).join(", ")}</Fact>
              <Fact label="Started">{formatDay(tenancy.startDate)}</Fact>
              <Fact label="Ends">{tenancy.endDate ? formatDay(tenancy.endDate) : "Rolling"}</Fact>
              <Fact label="Rent">
                {formatMoney(tenancy.rentAmount)} {rentPeriodLabel(tenancy.rentFrequency)}
              </Fact>
              <Fact label="Payment ref">{paymentRef ? <CopyPaymentRef value={paymentRef} /> : "—"}</Fact>
              <Fact label="Status">
                <StatusBadge status={tenancy.status} />
              </Fact>
              <Fact label="Property">
                <Link href={`/properties/${property.id}`} className="text-primary hover:underline">
                  {property.displayAddress}
                </Link>
              </Fact>
              <Fact label="Landlord">
                {landlord ? (
                  <Link href={`/landlords/${landlord.id}`} className="text-primary hover:underline">
                    {displayPersonName(landlord.firstName, landlord.lastName)}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
            </dl>
          </section>
        </div>
      ),
    },
    {
      id: "money",
      label: "Money",
      count: detail.overdue > 0.004 ? 1 : 0,
      countTone: "danger",
      content: (
        <>
          <AdminSection
            title="Rent and pay day"
            description="How often the tenant pays and when. Rent is raised from this each morning."
            className="mt-4"
          >
            <TenancyRentSchedulePanel
              tenancyId={tenancy.id}
              frequency={schedule.frequency}
              rent={Number(tenancy.rentAmount)}
              nextDue={nextRentDue}
              legacy={!schedule.from}
              ended={ended}
            />
          </AdminSection>
          <AdminSection
            title="Rent account"
            description="Every charge and payment, newest first. The balance is what the tenant owes after each line."
            actions={
              <a href={`/api/admin/tenancies/${tenancy.id}/ledger`} className="text-sm text-primary hover:underline">
                Download PDF
              </a>
            }
            className="mt-4"
          >
            {newestFirst.length ? (
              <AdminTable headers={["Date", "What", "Charged", "Paid", "Balance"]}>
                {newestFirst.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatDay(l.dueDate ?? l.date)}</td>
                    <td className="px-4 py-2.5">{l.description}</td>
                    <td className="px-4 py-2.5 tabular-nums">{l.charge ? formatMoney(l.charge) : ""}</td>
                    <td className="px-4 py-2.5 tabular-nums text-emerald-700">{l.paid ? formatMoney(l.paid) : ""}</td>
                    <td
                      className={`px-4 py-2.5 tabular-nums font-medium ${
                        l.balance > 0.004 ? "text-red-700" : l.balance < -0.004 ? "text-emerald-700" : ""
                      }`}
                    >
                      {l.balance < -0.004 ? `${formatMoney(-l.balance)} credit` : formatMoney(l.balance)}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing charged or paid yet.</p>
            )}
          </AdminSection>
          <AdminSection title="Rent arrears" description="Agree a repayment plan. Automatic reminders are switched on in Settings.">
            <TenancyArrearsPanel
              tenancyId={tenancy.id}
              overdue={detail.overdue}
              plan={detail.paymentPlan}
              progress={detail.paymentPlan ? planProgress(detail.paymentPlan, detail.overdue, new Date()) : null}
              reminders={(tenancy.arrearsReminders as { sent: number[]; lastSentAt?: string } | null) ?? null}
            />
          </AdminSection>
          <AdminSection
            title="Credit and opening balance"
            description="Overpayments and rent paid ahead, held for the tenant. Set an opening balance for a tenancy taken on from another agent."
          >
            <TenancyCreditPanel
              tenancyId={tenancy.id}
              credit={credit}
              rent={Number(tenancy.rentAmount)}
              nextDue={openInvoices[0]?.dueDate ?? null}
              ended={ended}
              opening={opening}
              frequency={schedule.frequency}
            />
          </AdminSection>
        </>
      ),
    },
    {
      id: "people",
      label: "People",
      count: rtrMissing.length,
      countTone: "warning",
      content: (
        <AdminSection title="Tenants and guarantors" description="Everyone named on the tenancy is jointly liable for the rent." className="mt-4">
          <TenancyPeoplePanel
            tenancyId={tenancy.id}
            tenants={tenants}
            guarantors={detail.guarantors.map((g) => ({
              id: g.id,
              name: g.fullName ?? "Guarantor",
              email: g.email,
              phone: g.phone,
              guarantees: tenants.find((t) => t.renterId === g.guaranteesRenterId)?.name ?? null,
            }))}
            renterOptions={renters
              .filter((r) => !onTenancy.has(r.id) && !busyRenters.has(r.id))
              .map((r) => ({ id: r.id, label: displayPersonName(r.firstName, r.lastName), hint: r.email }))}
            addRenter={
              <AdminEntityDialog
                triggerLabel="Add new renter"
                title="Add renter"
                description="Save them here, then pick them in the search to add them to this tenancy."
                triggerVariant="ghost"
                triggerSize="sm"
              >
                <RenterForm compact />
              </AdminEntityDialog>
            }
          />
        </AdminSection>
      ),
    },
    {
      id: "agreement",
      label: "Agreement & notices",
      content: (
        <>
          <AdminSection title="Tenancy agreement" description="Sends a written statement of terms for everyone to sign online. Signers confirm a code sent to their email, and everyone gets the signed copy with its audit trail." className="mt-4">
            <TenancyAgreementPanel
              tenancyId={tenancy.id}
              agreements={detail.agreements.map(({ agreement, signatures, events }) => ({
                id: agreement.id,
                status: agreement.status,
                createdAt: agreement.createdAt.toISOString(),
                completedAt: agreement.completedAt?.toISOString() ?? null,
                signedPdfSha256: agreement.signedPdfSha256,
                signatures: signatures.map((s) => ({
                  id: s.id,
                  role: s.role,
                  name: s.fullName,
                  hasEmail: Boolean(s.email),
                  signedAt: s.signedAt?.toISOString() ?? null,
                  verifiedBy: s.verifiedBy,
                })),
                events: events.map((e) => ({
                  id: e.id,
                  event: e.event,
                  who: e.who ?? ((e.detail as { who?: string } | null)?.who || null),
                  ip: e.ip,
                  at: e.createdAt.toISOString(),
                })),
              }))}
              eventLabels={AGREEMENT_EVENT_LABELS}
            />
          </AdminSection>
          <div id="notices" />
          <AdminSection title="Notices" description="Section 13 rent increases live on Deposits & notices. Possession notices are served here.">
            <TenancyNoticesPanel
              tenancyId={tenancy.id}
              overdue={detail.overdue}
              rent={Number(tenancy.rentAmount)}
              initialOpen={serve === "section8"}
              notices={detail.notices.map(({ notice, documentUrl }) => ({
                id: notice.id,
                type: notice.type,
                servedAt: notice.servedAt?.toISOString() ?? null,
                effectiveAt: notice.effectiveAt,
                pdfUrl: documentUrl,
              }))}
              grounds={SECTION_8_GROUNDS}
            />
          </AdminSection>
        </>
      ),
    },
    {
      id: "deposit",
      label: "Deposit",
      content: (
        <AdminSection title={depositReturnRelevant ? "Deposit return" : "Deposit"} description={depositReturnRelevant ? "Agree deductions at the end of the tenancy, or track a dispute with the scheme." : undefined} className="mt-4">
          {depositReturnRelevant ? (
            <TenancyDepositPanel
              tenancyId={tenancy.id}
              deposit={tenancy.depositAmount ? Number(tenancy.depositAmount) : 0}
              scheme={tenancy.depositScheme}
              reference={tenancy.depositProtectionRef}
              depositReturn={detail.depositReturn}
            />
          ) : (
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p>
                {tenancy.depositAmount
                  ? tenancy.depositProtectionRef
                    ? `${formatMoney(tenancy.depositAmount)} protected with ${tenancy.depositScheme} (${tenancy.depositProtectionRef}).`
                    : `${formatMoney(tenancy.depositAmount)} taken but not recorded as protected. Record it on Deposits & notices.`
                  : "No deposit taken."}
              </p>
              <p className="mt-2 text-muted-foreground">
                Deductions and the return are recorded here once the tenancy is ending.
              </p>
            </div>
          )}
        </AdminSection>
      ),
    },
    {
      id: "move",
      label: "Move in & out",
      content: (
        <AdminSection
          title="Council and utilities"
          description="Tell the council and suppliers who is living there, with the meter readings from the inspection."
          className="mt-4"
        >
          <UtilityNoticePanel
            tenancyId={tenancy.id}
            startDate={tenancy.startDate}
            endDate={tenancy.endDate}
            notices={parseUtilityNotices(tenancy.utilityNotices)}
            moveIn={moveIn}
            moveOut={moveOut}
            savedContacts={parseUtilityContacts(branchSettings?.settings.utility_contacts)}
          />
        </AdminSection>
      ),
    },
    {
      id: "activity",
      label: "Activity",
      content: (
        <AdminSection title="Activity" description="Changes made by your team, newest first." className="mt-4">
          <ActivityList entries={activity} />
        </AdminSection>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title={property.displayAddress}
        description={`${tenants.map((t) => t.name).join(", ")}. Started ${formatDay(tenancy.startDate)}${tenancy.endDate ? `, ends ${formatDay(tenancy.endDate)}` : ""}.`}
        actions={
          <>
            <StatusBadge status={tenancy.status} />
            <Link href={`/properties/${property.id}`} className="text-sm text-primary hover:underline">
              Property
            </Link>
            <TenancyMoreMenu
              tenancyId={tenancy.id}
              active={tenancy.status === "active"}
              ledgerHref={`/api/admin/tenancies/${tenancy.id}/ledger`}
            />
          </>
        }
      />
      <PropertyTabs tabs={tabs} summary={summary} initialTab={serve === "section8" ? "agreement" : tab === "notices" ? "agreement" : tab} ariaLabel="Tenancy sections" />
    </div>
  );
}
