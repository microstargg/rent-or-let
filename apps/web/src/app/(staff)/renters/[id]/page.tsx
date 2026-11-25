import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminSection, StatusBadge } from "@/components/admin/admin-page";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { RenterForm } from "@/components/admin/renter-form";
import { RenterInviteButton } from "@/components/admin/renter-invite-button";
import { RenterDocumentsPanel, RenterRightToRentPanel } from "@/components/admin/renter-profile-panels";
import { ActivityList } from "@/components/admin/activity-list";
import { listActivity } from "@/lib/db/queries/activity";
import {
  getRenterProfile,
  RENTER_DOCUMENT_KINDS,
  RENTER_DOCUMENT_RETENTION,
  RTR_METHODS,
} from "@/lib/db/queries/renter-documents";
import { displayPersonName } from "@/lib/person-name";

function ukDate(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "—";
}

export default async function RenterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getRenterProfile(id);
  if (!profile) notFound();
  const { renter, tenancies, documents, applications } = profile;
  const activity = await listActivity({ entityId: renter.id }, 30);
  const name = displayPersonName(renter.firstName, renter.lastName);

  return (
    <div>
      <AdminPageHeader
        title={name}
        description={[renter.email, renter.phone].filter(Boolean).join(" · ") || "No contact details yet."}
        actions={
          <>
            <Link href="/renters" className="text-sm text-primary hover:underline">
              All renters
            </Link>
            <AdminEntityDialog triggerLabel="Edit details" title="Edit renter" triggerVariant="outline" triggerSize="sm">
              <RenterForm
                compact
                initial={{
                  id: renter.id,
                  firstName: renter.firstName,
                  lastName: renter.lastName,
                  email: renter.email,
                  phone: renter.phone,
                  notes: renter.notes,
                }}
              />
            </AdminEntityDialog>
            {renter.email && <RenterInviteButton renterId={renter.id} email={renter.email} />}
          </>
        }
      />

      <AdminSection
        title="Right to Rent"
        description="Every adult who will live in the property needs a check before the tenancy starts."
      >
        <RenterRightToRentPanel
          renterId={renter.id}
          checkedAt={renter.rtrCheckedAt}
          method={renter.rtrMethod}
          expiresAt={renter.rtrExpiresAt}
          shareCode={renter.rtrShareCode}
          methods={RTR_METHODS}
        />
      </AdminSection>

      <AdminSection
        title="Documents"
        description={`Stored privately: only signed-in staff can open them, and each view is logged. Right to Rent evidence is deleted ${RENTER_DOCUMENT_RETENTION.rightToRentMonths} months after the last tenancy ends, other documents after ${RENTER_DOCUMENT_RETENTION.otherMonths / 12} years, and documents for renters who never took a tenancy after ${RENTER_DOCUMENT_RETENTION.noTenancyMonths} months.`}
      >
        <RenterDocumentsPanel
          renterId={renter.id}
          kinds={RENTER_DOCUMENT_KINDS}
          documents={documents.map((d) => ({
            id: d.id,
            kind: d.kind,
            label: d.label,
            filename: d.filename,
            sizeBytes: d.sizeBytes,
            uploadedBy: d.uploadedBy,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </AdminSection>

      <AdminSection title="Tenancies">
        {tenancies.length ? (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {tenancies.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href={`/tenancies/${t.id}`} className="font-medium text-primary hover:underline">
                  {t.address}
                </Link>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {t.primaryRenterId === renter.id ? "Lead tenant" : "Joint tenant"}, from {ukDate(t.startDate)}
                  {t.endDate ? ` to ${ukDate(t.endDate)}` : ""}
                  <StatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not on any tenancy yet.</p>
        )}
      </AdminSection>

      {applications.length > 0 && (
        <AdminSection title="Applications" description="Applications made with this renter's email address.">
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {applications.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href="/applications" className="text-primary hover:underline">
                  Applied {a.createdAt.toLocaleDateString("en-GB")}
                </Link>
                <span className="flex items-center gap-2 text-muted-foreground">
                  Referencing: {a.referencingStatus.replace(/_/g, " ")}
                  <StatusBadge status={a.status} />
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {renter.notes && (
        <AdminSection title="Notes">
          <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-sm">{renter.notes}</p>
        </AdminSection>
      )}

      <AdminSection title="History">
        <ActivityList entries={activity} />
      </AdminSection>
    </div>
  );
}
