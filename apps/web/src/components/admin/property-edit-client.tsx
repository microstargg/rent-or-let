"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PropertyForm } from "@/components/admin/property-form";
import { Button } from "@/components/ui/button";
import type { Property } from "@/types";

interface PropertyEditClientProps {
  property: Property;
}

/** Sync and "View on site" buttons for the property page header. */
export function PropertyHeaderActions({ property }: { property: Pick<Property, "id" | "slug" | "status"> }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function syncToPortals() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/properties/${property.id}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const hits = Array.isArray(data.hits)
          ? data.hits.map((h: { phrase: string }) => h.phrase).join(", ")
          : "";
        window.alert(data.message ? `${data.message}${hits ? `\n${hits}` : ""}` : "Sync failed");
        return;
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={syncToPortals} disabled={syncing}>
        {syncing ? "Syncing…" : "Sync to portals"}
      </Button>
      {property.status === "available" && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/properties/${property.slug}`} target="_blank">
            View on site
          </Link>
        </Button>
      )}
    </>
  );
}

/** The listing editor (the "Listing" tab). */
export function PropertyEditClient({ property }: PropertyEditClientProps) {
  const router = useRouter();

  return (
    <PropertyForm
      property={property}
      imageCount={property.images?.length ?? 0}
      onSuccess={() => router.refresh()}
    />
  );
}
