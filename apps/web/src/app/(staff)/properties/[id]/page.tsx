import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/db/queries";
import { PropertyEditClient } from "@/components/admin/property-edit-client";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) notFound();
  return <PropertyEditClient property={property} />;
}
