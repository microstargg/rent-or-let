"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("property_id", propertyId);

    try {
      await fetch("/api/admin/properties/images", {
        method: "POST",
        body: formData,
      });
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mt-8 max-w-2xl">
      <h2 className="text-lg font-semibold">Property images</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {images.map((image) => (
          <div key={image.id} className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt_text ?? ""} className="aspect-[4/3] w-full object-cover" />
          </div>
        ))}
      </div>
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
