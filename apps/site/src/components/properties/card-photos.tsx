"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CardPhotosProps {
  images: Array<{ url: string; altText?: string }>;
  alt: string;
  /** Eager-load the first photo (e.g. the hero card). */
  priority?: boolean;
  className?: string;
  /** Make the strip keyboard-scrollable when it isn't inside a link (listing page). */
  focusable?: boolean;
}

const MAX_PHOTOS = 5;

/**
 * A listing card's photos, like flicking through a window card: swipe on touch screens,
 * and on a mouse the photo steps along as the pointer moves across it.
 */
export function CardPhotos({ images, alt, priority, className, focusable }: CardPhotosProps) {
  const photos = images.slice(0, MAX_PHOTOS);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Only the first photo loads up front; the rest arrive once someone shows interest.
  const [awake, setAwake] = useState(false);
  const wake = () => setAwake(true);

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track || next === index) return;
    setIndex(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: "instant" as ScrollBehavior });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || photos.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const slot = Math.floor(((event.clientX - rect.left) / rect.width) * photos.length);
    goTo(Math.min(photos.length - 1, Math.max(0, slot)));
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  if (photos.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-sm text-muted-foreground", className)}>
        Photo coming soon
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      onPointerEnter={wake}
      onTouchStart={wake}
      onFocus={wake}
      onPointerMove={onPointerMove}
      onPointerLeave={() => goTo(0)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        {...(focusable ? { tabIndex: 0, role: "region", "aria-label": `Photos of ${alt}` } : {})}
        className="no-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {(awake ? photos : photos.slice(0, 1)).map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.url}
            src={photo.url}
            alt={i === 0 ? (photo.altText ?? alt) : ""}
            loading={priority && i === 0 ? "eager" : "lazy"}
            draggable={false}
            className="h-full w-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>
      {photos.length > 1 && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
          {photos.map((photo, i) => (
            <span
              key={photo.url}
              className={cn(
                "h-1.5 rounded-full bg-white/70 shadow-[0_0_2px_rgba(0,0,0,0.4)] transition-all duration-200 motion-reduce:transition-none",
                i === index ? "w-4 bg-white" : "w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
