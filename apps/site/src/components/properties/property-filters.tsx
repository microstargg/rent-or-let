"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTenant } from "@repo/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useTenant();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const params = new URLSearchParams();
      const beds = formData.get("beds") as string;
      const maxRent = formData.get("maxRent") as string;
      const town = formData.get("town") as string;
      if (beds) params.set("beds", beds);
      if (maxRent) params.set("maxRent", maxRent);
      if (town) params.set("town", town);
      if (formData.get("available")) params.set("available", "now");
      const sort = formData.get("sort") as string;
      if (sort) params.set("sort", sort);
      router.push(`/properties?${params.toString()}`);
    },
    [router]
  );

  const control =
    "h-11 rounded-md border border-input bg-card px-3 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Filter homes"
      className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center"
    >
      <label className="sr-only" htmlFor="beds">
        Minimum bedrooms
      </label>
      <select id="beds" name="beds" defaultValue={searchParams.get("beds") ?? ""} className={control}>
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ beds
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="maxRent">
        Maximum rent, pounds per month
      </label>
      <input
        id="maxRent"
        name="maxRent"
        type="number"
        min={0}
        step={25}
        inputMode="numeric"
        defaultValue={searchParams.get("maxRent") ?? ""}
        placeholder="Max £ pcm"
        className={cn(control, "tabular-nums md:w-32")}
      />
      <label className="sr-only" htmlFor="town">
        Town
      </label>
      <input
        id="town"
        name="town"
        defaultValue={searchParams.get("town") ?? ""}
        placeholder="Any town"
        className={cn(control, "md:w-44")}
      />
      <label className="sr-only" htmlFor="sort">
        Sort by
      </label>
      <select id="sort" name="sort" defaultValue={searchParams.get("sort") ?? ""} className={control}>
        <option value="">Default order</option>
        <option value="price_asc">Lowest price</option>
        <option value="price_desc">Highest price</option>
      </select>
      <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-card px-3 text-[15px] font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary md:col-span-1">
        <input
          type="checkbox"
          name="available"
          value="now"
          defaultChecked={searchParams.get("available") === "now"}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Available now
      </label>
      <Button type="submit" className="col-span-2 h-11 px-6 md:col-span-1 md:ml-auto">
        Search
      </Button>
    </form>
  );
}
