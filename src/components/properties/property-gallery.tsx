"use client";

import { useState } from "react";

interface PropertyGalleryProps {
  images: Array<{ url: string; alt_text?: string }>;
  displayAddress: string;
}

export function PropertyGallery({ images, displayAddress }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-muted text-muted-foreground">
        Photos coming soon
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.url}
          alt={activeImage.alt_text ?? displayAddress}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                index === activeIndex ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label={`View photo ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
