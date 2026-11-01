"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Tick } from "./ui";

export function VeriFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["beds", "maxRent", "town", "sort"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (data.get("available")) params.set("available", "now");
    const query = params.toString();
    router.push(query ? `/properties?${query}` : "/properties");
  };

  return (
    <form onSubmit={onSubmit} role="search" aria-label="Filter homes" className="v-filter">
      <label className="sr-only" htmlFor="v-beds">
        Minimum bedrooms
      </label>
      <select id="v-beds" name="beds" defaultValue={searchParams.get("beds") ?? ""}>
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ beds
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="v-max">
        Maximum rent, pounds per month
      </label>
      <input
        id="v-max"
        name="maxRent"
        type="number"
        min={0}
        step={25}
        inputMode="numeric"
        placeholder="Max £ pcm"
        defaultValue={searchParams.get("maxRent") ?? ""}
        className="v-num"
      />
      <label className="sr-only" htmlFor="v-town">
        Town
      </label>
      <input
        id="v-town"
        name="town"
        type="text"
        placeholder="Any town"
        defaultValue={searchParams.get("town") ?? ""}
        className="col-span-2 md:col-span-1"
      />
      <label className="sr-only" htmlFor="v-sort">
        Sort by
      </label>
      <select id="v-sort" name="sort" defaultValue={searchParams.get("sort") ?? ""}>
        <option value="">Default order</option>
        <option value="price_asc">Lowest rent</option>
        <option value="price_desc">Highest rent</option>
      </select>
      <label className="v-filter__check">
        <input
          type="checkbox"
          name="available"
          value="now"
          defaultChecked={searchParams.get("available") === "now"}
          className="h-4 w-4 accent-[var(--v-pen)]"
        />
        Available now
      </label>
      <button type="submit" className="v-btn v-hover col-span-2 md:col-span-1">
        <Tick hover box />
        Search
      </button>
    </form>
  );
}
