"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PropertyForm } from "@/components/admin/property-form";
import { PropertyImageUpload } from "@/components/admin/property-image-upload";
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

/** The listing form, photos and portal sync state (the "Listing" tab). */
export function PropertyEditClient({ property }: PropertyEditClientProps) {
  const router = useRouter();

  return (
    <div>
      <PropertyForm
        property={property}
        imageCount={property.images?.length ?? 0}
        onSuccess={() => router.refresh()}
      />
      <PropertyImageUpload propertyId={property.id} images={property.images ?? []} />

      {Object.keys(property.portal_sync).length > 0 && (
        <div className="mt-8 max-w-2xl rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Portal sync status</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {Object.entries(property.portal_sync).map(([portal, state]) => (
              <div key={portal} className="flex flex-wrap gap-x-4">
                <dt className="w-32 font-medium capitalize">{portal}</dt>
                <dd className="min-w-0 text-muted-foreground">
                  {state.status ?? "unknown"}
                  {state.last_synced_at && ` — ${new Date(state.last_synced_at).toLocaleString("en-GB")}`}
                  {state.error && ` — ${state.error}`}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
