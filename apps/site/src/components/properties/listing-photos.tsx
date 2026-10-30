"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { CardPhotos } from "@/components/properties/card-photos";
import { cn } from "@/lib/utils";

interface ListingPhotosProps {
  images: Array<{ url: string; altText?: string }>;
  displayAddress: string;
}

/** Listing page photos: a five-up grid on desktop, a swipe strip on phones, full gallery in a dialog. */
export function ListingPhotos({ images, displayAddress }: ListingPhotosProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-muted text-muted-foreground">
        Photos coming soon
      </div>
    );
  }

  const grid = images.slice(0, 5);

  return (
    <>
      <div className="relative -mx-4 md:hidden">
        <CardPhotos images={images} alt={displayAddress} priority focusable className="aspect-[4/3]" />
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-[13px] font-semibold shadow-sm"
          >
            <Images aria-hidden className="h-4 w-4" />
            {images.length} photos
          </button>
        )}
      </div>

      <div
        className={cn(
          "hidden gap-2 overflow-hidden rounded-xl md:grid",
          grid.length >= 5
            ? "h-[460px] grid-cols-[2fr_1fr_1fr] grid-rows-2"
            : grid.length >= 3
              ? "h-[420px] grid-cols-[2fr_1fr] grid-rows-2"
              : "h-[440px] grid-cols-1"
        )}
      >
        {grid.slice(0, grid.length >= 5 ? 5 : grid.length >= 3 ? 3 : 1).map((image, index, shown) => {
          const isLast = index === shown.length - 1;
          return (
            <button
              key={image.url}
              type="button"
              onClick={() => setOpenAt(index)}
              className={cn(
                "group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                index === 0 && shown.length > 1 && "row-span-2"
              )}
              aria-label={`Open photo ${index + 1} of ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={index === 0 ? (image.altText ?? displayAddress) : ""}
                loading={index === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
              />
              {isLast && images.length > shown.length ? (
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm">
                  <Images aria-hidden className="h-4 w-4" />
                  All {images.length} photos
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dialog open={openAt !== null} onOpenChange={(open) => !open && setOpenAt(null)}>
        <DialogContent className="max-w-5xl p-4 sm:p-6">
          <DialogTitle className="pr-8 text-base">{displayAddress}</DialogTitle>
          {openAt !== null ? (
            <PropertyGallery images={images} displayAddress={displayAddress} initialIndex={openAt} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
