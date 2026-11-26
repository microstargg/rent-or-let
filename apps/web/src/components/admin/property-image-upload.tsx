"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PropertyImage } from "@/types";

interface PropertyImageUploadProps {
  propertyId: string;
  images: PropertyImage[];
}

/** Portals show listings with five or more photos higher and get more leads from them. */
export const RECOMMENDED_PHOTOS = 5;

/**
 * Photo carousel manager: a grid of photos in portal order, with the lead photo first.
 * Several files can be uploaded at once.
 */
export function PropertyImageUpload({ propertyId, images }: PropertyImageUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setError(null);
    setUploading({ done: 0, total: files.length });
    let failed = 0;
    try {
      for (const [i, file] of files.entries()) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("property_id", propertyId);
        const res = await fetch("/api/admin/properties/images", { method: "POST", body: formData });
        if (!res.ok) failed++;
        setUploading({ done: i + 1, total: files.length });
      }
      if (failed) setError(`${failed} of ${files.length} photos didn't upload. Try those again.`);
      router.refresh();
    } finally {
      setUploading(null);
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

    setBusyId(moved.id);
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

  const short = sorted.length < RECOMMENDED_PHOTOS;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-sm", short ? "text-amber-800" : "text-muted-foreground")}>
          {sorted.length} {sorted.length === 1 ? "photo" : "photos"}
          {short
            ? `. Portals recommend at least ${RECOMMENDED_PHOTOS}.`
            : ". The first photo leads in portal search results."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(uploading)}
        >
          <ImagePlus className="mr-1.5 h-4 w-4" />
          {uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Upload photos"}
        </Button>
        <input
          ref={inputRef}
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {sorted.length > 0 ? (
        <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((image, index) => (
            <li
              key={image.id}
              className={cn(
                "overflow-hidden rounded-lg border bg-card",
                busyId === image.id && "opacity-60",
                index === 0 && "ring-2 ring-primary/60"
              )}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt_text ?? ""} className="h-full w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {index + 1}
                </span>
                {image.is_primary && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                    Main
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={busyId === image.id || index === 0}
                    onClick={() => moveImage(index, -1)}
                    aria-label="Move photo earlier"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={busyId === image.id || index === sorted.length - 1}
                    onClick={() => moveImage(index, 1)}
                    aria-label="Move photo later"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={busyId === image.id || image.is_primary}
                    onClick={() => setPrimary(image.id)}
                    aria-label="Make main photo"
                    title="Make main photo"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-700 hover:text-red-800"
                    disabled={busyId === image.id}
                    onClick={() => deleteImage(image.id)}
                    aria-label="Delete photo"
                    title="Delete photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-10 text-sm text-muted-foreground hover:bg-muted/40"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="font-medium text-foreground">Add photos</span>
          <span>Lead with your best exterior shot. You can pick several at once.</span>
        </button>
      )}
    </div>
  );
}
