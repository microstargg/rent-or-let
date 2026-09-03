"use client";

import { useRouter } from "next/navigation";
import { PropertyForm } from "@/components/admin/property-form";
import type { Property } from "@/types";

export default function NewPropertyPage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="text-3xl font-bold">Add property</h1>
      <PropertyForm
        onSuccess={(id) => router.push(`/admin/properties/${id}`)}
      />
    </div>
  );
}
