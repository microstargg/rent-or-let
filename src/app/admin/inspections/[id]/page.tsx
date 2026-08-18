import { notFound } from "next/navigation";
import Link from "next/link";
import { getInspectionById } from "@/lib/db/queries";
import { InspectionEditor } from "@/components/admin/inspection-editor";
import { Button } from "@/components/ui/button";

export default async function AdminInspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getInspectionById(id);
  if (!row) notFound();

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="min-h-11 px-2">
        <Link href="/admin/inspections">← Inspections</Link>
      </Button>
      <h1 className="mt-4 text-2xl font-bold capitalize">
        {row.inspection.type.replaceAll("_", " ")} inspection
      </h1>
      <p className="text-muted-foreground">{row.property.displayAddress}</p>
      <div className="mt-6">
        <InspectionEditor
          inspectionId={row.inspection.id}
          initialMeta={row.inspection.meta}
          initialNotes={row.inspection.notes}
          initialSummary={row.inspection.summary}
          completed={Boolean(row.inspection.completedAt)}
        />
      </div>
    </div>
  );
}
