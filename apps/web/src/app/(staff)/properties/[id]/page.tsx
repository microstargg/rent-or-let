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

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) notFound();
  const [keys, viewingRows, activity] = await Promise.all([
    listPropertyKeys(id),
    listViewingsForProperty(id),
    listActivity({ propertyId: id }, 30),
  ]);

  return (
    <div>
      <PropertyEditClient property={property} />

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
