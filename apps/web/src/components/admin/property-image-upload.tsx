"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropertyImage } from "@/types";

interface PropertyImageUploadProps {
  propertyId: string;
  images: PropertyImage[];
}

export function PropertyImageUpload({ propertyId, images }: PropertyImageUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("property_id", propertyId);

    try {
      const res = await fetch("/api/admin/properties/images", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function setPrimary(imageId: string) {
    setBusyId(imageId);
    try {
      await fetch(`/api/admin/properties/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Delete this photo?")) return;

    setBusyId(imageId);
    try {
      await fetch(`/api/admin/properties/images/${imageId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyId(reordered[targetIndex].id);
    try {
      await fetch("/api/admin/properties/images/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          image_ids: reordered.map((image) => image.id),
        }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 max-w-2xl">
      <h2 className="text-lg font-semibold">Property images</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The first photo marked as main is used on listing cards. Order matches portal photo
        sequence.
      </p>

      {sorted.length > 0 ? (
        <div className="mt-4 space-y-3">
          {sorted.map((image, index) => (
            <div
              key={image.id}
              className="flex gap-3 rounded-lg border bg-card p-2"
            >
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt_text ?? ""}
                  className="h-full w-full object-cover"
                />
                {image.is_primary && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Main
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">
                  Photo {index + 1} of {sorted.length}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === image.id || index === 0}
                    onClick={() => moveImage(index, -1)}
                    aria-label="Move photo up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === image.id || index === sorted.length - 1}
                    onClick={() => moveImage(index, 1)}
                    aria-label="Move photo down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === image.id || image.is_primary}
                    onClick={() => setPrimary(image.id)}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" />
                    Set main
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === image.id}
                    onClick={() => deleteImage(image.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No photos yet.</p>
      )}

      <div className="mt-4">
        <Label htmlFor="image-upload">Upload image</Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="mt-1"
        />
        {uploading && <p className="mt-1 text-sm text-muted-foreground">Uploading…</p>}
      </div>
    </div>
  );
}
