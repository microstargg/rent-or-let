import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultBranch, listRenters } from "@/lib/db/queries";
import { getTenancyDetail } from "@/lib/db/queries/tenancy";
import { AdminPageHeader, AdminSection, StatPill, StatusBadge } from "@/components/admin/admin-page";
import { TenancyEndButton } from "@/components/admin/tenancy-end-button";
import {
  TenancyAgreementPanel,
  TenancyDepositPanel,
  TenancyNoticesPanel,
  TenancyPeoplePanel,
} from "@/components/admin/tenancy-detail-panels";
import { displayPersonName } from "@/lib/person-name";
import { formatCurrency } from "@/lib/utils";
import { SECTION_8_GROUNDS } from "@/lib/tenancy/section8";

export default async function TenancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTenancyDetail(id);
  if (!detail) notFound();
  const branch = await getDefaultBranch();
  const renters = await listRenters(branch?.id);
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

  return (
    <div>
      <AdminPageHeader
        title={property.displayAddress}
        description={`${tenants.map((t) => t.name).join(", ")}. Started ${tenancy.startDate}${tenancy.endDate ? `, ends ${tenancy.endDate}` : ""}.`}
        actions={
          <>
            <Link href={`/properties/${property.id}`} className="text-sm text-primary hover:underline">
              Property
            </Link>
            {tenancy.status === "active" && <TenancyEndButton id={tenancy.id} />}
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatPill label="Rent" value={formatCurrency(Number(tenancy.rentAmount))} />
        <StatPill
          label="Overdue"
          value={formatCurrency(detail.overdue)}
          tone={detail.overdue > 0 ? "danger" : "success"}
        />
        <StatPill
          label="Deposit"
          value={tenancy.depositAmount ? formatCurrency(Number(tenancy.depositAmount)) : "None"}
          hint={tenancy.depositProtectionRef ? `${tenancy.depositScheme} ${tenancy.depositProtectionRef}` : "Not protected"}
          tone={tenancy.depositAmount && !tenancy.depositProtectionRef ? "warning" : "neutral"}
        />
        <div className="flex items-center">
          <StatusBadge status={tenancy.status} />
          {landlord && (
            <span className="ml-3 text-sm text-muted-foreground">
              Landlord: {displayPersonName(landlord.firstName, landlord.lastName)}
            </span>
          )}
        </div>
      </div>

      <AdminSection title="Tenants and guarantors" description="Everyone named on the tenancy is jointly liable for the rent.">
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
            .filter((r) => !onTenancy.has(r.id))
            .map((r) => ({ id: r.id, label: displayPersonName(r.firstName, r.lastName) }))}
        />
      </AdminSection>

      <AdminSection title="Tenancy agreement" description="Sends a written statement of terms for everyone to sign online.">
        <TenancyAgreementPanel
          tenancyId={tenancy.id}
          agreements={detail.agreements.map(({ agreement, signatures }) => ({
            id: agreement.id,
            status: agreement.status,
            createdAt: agreement.createdAt.toISOString(),
            completedAt: agreement.completedAt?.toISOString() ?? null,
            signatures: signatures.map((s) => ({
              id: s.id,
              role: s.role,
              name: s.fullName,
              signedAt: s.signedAt?.toISOString() ?? null,
            })),
          }))}
        />
      </AdminSection>

      <AdminSection title="Deposit return" description="Agree deductions at the end of the tenancy, or track a dispute with the scheme.">
        <TenancyDepositPanel
          tenancyId={tenancy.id}
          deposit={tenancy.depositAmount ? Number(tenancy.depositAmount) : 0}
          scheme={tenancy.depositScheme}
          reference={tenancy.depositProtectionRef}
          depositReturn={detail.depositReturn}
        />
      </AdminSection>

      <AdminSection title="Notices" description="Section 13 rent increases live on Deposits & notices. Possession notices are served here.">
        <TenancyNoticesPanel
          tenancyId={tenancy.id}
          overdue={detail.overdue}
          rent={Number(tenancy.rentAmount)}
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
    </div>
  );
}
