"use client";

import { useRouter } from "next/navigation";
import { PropertyForm } from "@/components/admin/property-form";
import type { Property } from "@/types";

export default function NewPropertyPage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add property</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in the three steps, save as a draft, then add photos and make it live.
      </p>
      <PropertyForm
        onSuccess={(id) => router.push(`/properties/${id}?tab=listing`)}
      />
    </div>
  );
}
