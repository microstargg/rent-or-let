"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableListing {
  bedrooms: number;
  pricePcm: number;
  /** Matched the same way the platform filters: town contains the text. */
  town: string;
}

interface HeroSearchProps {
  /** Compact copy of the listings the page already loaded, so the count needs no extra request. */
  listings: SearchableListing[];
  /** False when listings couldn't be loaded: the button then just says "Search". */
  countsAvailable: boolean;
  className?: string;
}

const fieldClass =
  "flex min-h-[58px] flex-col justify-center rounded-md border border-input bg-card px-3.5 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30";
const labelClass = "text-xs font-semibold text-muted-foreground";
const controlClass =
  "w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/70";

export function HeroSearch({ listings, countsAvailable, className }: HeroSearchProps) {
  const router = useRouter();
  const id = useId();
  const [beds, setBeds] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [town, setTown] = useState("");

  const count = useMemo(() => {
    const minBeds = Number(beds) || 0;
    const rent = Number(maxRent) || Infinity;
    const area = town.trim().toLowerCase();
    return listings.filter(
      (listing) =>
        listing.bedrooms >= minBeds &&
        listing.pricePcm <= rent &&
        (!area || listing.town.toLowerCase().includes(area))
    ).length;
  }, [listings, beds, maxRent, town]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (beds) params.set("beds", beds);
    if (maxRent) params.set("maxRent", maxRent);
    if (town.trim()) params.set("town", town.trim());
    const qs = params.toString();
    router.push(`/properties${qs ? `?${qs}` : ""}`);
  };

  const buttonLabel = !countsAvailable
    ? "Search homes"
    : count === 0
      ? "No matches yet"
      : `Show ${count} ${count === 1 ? "home" : "homes"}`;

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Search homes to let"
      className={cn(
        "grid grid-cols-2 gap-2 rounded-xl bg-card p-2.5 text-foreground shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] md:grid-cols-[1fr_1fr_1.3fr_auto]",
        className
      )}
    >
      <div className={fieldClass}>
        <label htmlFor={`${id}-beds`} className={labelClass}>
          Bedrooms
        </label>
        <select
          id={`${id}-beds`}
          value={beds}
          onChange={(event) => setBeds(event.target.value)}
          className={cn(controlClass, "-ml-0.5 cursor-pointer")}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor={`${id}-rent`} className={labelClass}>
          Max rent (£ pcm)
        </label>
        <input
          id={`${id}-rent`}
          type="number"
          inputMode="numeric"
          min={0}
          step={25}
          placeholder="Any"
          value={maxRent}
          onChange={(event) => setMaxRent(event.target.value)}
          className={cn(controlClass, "tabular-nums")}
        />
      </div>
      <div className={cn(fieldClass, "col-span-2 md:col-span-1")}>
        <label htmlFor={`${id}-town`} className={labelClass}>
          Area
        </label>
        <input
          id={`${id}-town`}
          type="text"
          placeholder="Any town"
          value={town}
          onChange={(event) => setTown(event.target.value)}
          className={controlClass}
        />
      </div>
      <button
        type="submit"
        className="col-span-2 inline-flex min-h-[58px] items-center justify-center gap-2 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:col-span-1"
      >
        <Search aria-hidden className="h-4 w-4" />
        <span aria-live="polite" className="tabular-nums">
          {buttonLabel}
        </span>
      </button>
    </form>
  );
}
