import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/db/queries";
import { listPropertyKeys } from "@/lib/db/queries/keys";
import { listViewingsForProperty, toViewingItem } from "@/lib/db/queries/viewings";
import { listActivity } from "@/lib/db/queries/activity";
import { PropertyEditClient } from "@/components/admin/property-edit-client";
import { AdminSection } from "@/components/admin/admin-page";
import { KeysRegister } from "@/components/admin/keys-register";
import { BookViewingForm, ViewingsList } from "@/components/admin/viewings-panel";
import { ActivityList } from "@/components/admin/activity-list";
import { PropertyCompliancePanel } from "@/components/admin/property-compliance-panel";
import { listBranchRequirements } from "@/lib/db/queries/compliance";
import { propertyComplianceMeta, sortRequirements } from "@/lib/compliance/requirements";
import { complianceLabel } from "@/lib/portal-format";
import { REGISTER_WINDOWS } from "@/lib/compliance/register";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) notFound();
  const [keys, viewingRows, activity, requirementRows] = await Promise.all([
    listPropertyKeys(id),
    listViewingsForProperty(id),
    listActivity({ propertyId: id }, 30),
    listBranchRequirements(property.branch_id, { propertyIds: [id] }),
  ]);
  const complianceMeta = propertyComplianceMeta(requirementRows[0]?.property.metadata);
  const requirements = sortRequirements(requirementRows[0]?.requirements ?? []);

  return (
    <div>
      <PropertyEditClient property={property} />

      <AdminSection
        title="Compliance"
        description="What this property needs by law, and what's on file. Add certificates on the Compliance page."
      >
        <div className="rounded-xl border bg-card p-4">
          <PropertyCompliancePanel
            propertyId={id}
            gasSupply={complianceMeta.gasSupply !== false}
            licensing={complianceMeta.licensing ?? null}
            rows={requirements.map((r) => ({
              key: r.key,
              label: complianceLabel(r.type),
              reason: r.reason,
              status: r.status,
              expiresAt: r.item?.expiresAt ?? r.dueDate ?? null,
              tenancyLabel: r.tenancyId ? "current tenancy" : null,
              required: r.required,
            }))}
            register={(() => {
              const reg = requirementRows[0]?.register;
              return {
                region: reg?.region ?? null,
                regionGuessed: reg?.regionGuessed ?? false,
                regionLabel: reg?.region ? REGISTER_WINDOWS[reg.region].label : null,
                opens: reg?.opens ?? null,
                deadline: reg?.deadline ?? null,
                propertyNumber: reg?.propertyNumber ?? null,
                registeredAt: reg?.registeredAt ?? null,
                isLet: reg?.isLet ?? false,
                regions: Object.entries(REGISTER_WINDOWS).map(([value, w]) => ({ value, label: w.label })),
              };
            })()}
          />
        </div>
      </AdminSection>

      <AdminSection title="Keys" description="Who has which keys, and when they're due back.">
        <div className="rounded-xl border bg-card p-4">
          <KeysRegister
            propertyId={id}
            keys={keys.map((k) => ({
              id: k.id,
              label: k.label,
              keyCount: k.keyCount,
              holderType: k.holderType,
              holderName: k.holderName,
              outSince: k.outSince,
              dueBack: k.dueBack,
              notes: k.notes,
            }))}
          />
        </div>
      </AdminSection>

      <AdminSection title="Viewings" actions={<BookViewingForm propertyId={id} askForViewer />}>
        <div className="rounded-xl border bg-card p-4">
          <ViewingsList viewings={viewingRows.map(toViewingItem)} empty="No viewings yet." />
        </div>
      </AdminSection>

      <AdminSection title="Activity" description="Changes made by your team, newest first.">
        <ActivityList entries={activity} />
      </AdminSection>
    </div>
  );
}
