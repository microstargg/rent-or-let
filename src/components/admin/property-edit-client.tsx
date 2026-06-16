"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PropertyForm } from "@/components/admin/property-form";
import { PropertyImageUpload } from "@/components/admin/property-image-upload";
import { Button } from "@/components/ui/button";
import type { Property } from "@/types";

interface PropertyEditClientProps {
  property: Property;
}

export function PropertyEditClient({ property }: PropertyEditClientProps) {
  const router = useRouter();

  async function syncToPortals() {
    await fetch(`/api/admin/properties/${property.id}/sync`, { method: "POST" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Edit property</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncToPortals}>
            Sync to portals
          </Button>
          {property.status === "available" && (
            <Button asChild variant="outline">
              <Link href={`/properties/${property.slug}`} target="_blank">
                View on site
              </Link>
            </Button>
          )}
        </div>
      </div>

      <PropertyForm
        property={property}
        imageCount={property.images?.length ?? 0}
        onSuccess={() => router.refresh()}
      />
      <PropertyImageUpload propertyId={property.id} images={property.images ?? []} />

      {Object.keys(property.portal_sync).length > 0 && (
        <div className="mt-8 rounded-xl border p-4">
          <h2 className="font-semibold">Portal sync status</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {Object.entries(property.portal_sync).map(([portal, state]) => (
              <div key={portal} className="flex gap-4">
                <dt className="w-32 font-medium capitalize">{portal}</dt>
                <dd className="text-muted-foreground">
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
