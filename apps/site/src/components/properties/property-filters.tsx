"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTenant } from "@repo/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isVeriAgency } from "@/lib/veri";
import { cn } from "@/lib/utils";

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useTenant();
  const isVeri = isVeriAgency(id);

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

  if (!isVeri) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid gap-4 md:grid-cols-4 md:items-end",
        isVeri
          ? "rounded-[1.5rem] border border-foreground/10 bg-card px-5 py-5 shadow-[0_12px_40px_rgba(20,20,20,0.04)] md:px-6"
          : "rounded-xl border bg-card p-4"
      )}
    >
      <div>
        <Label
          htmlFor="beds"
          className={isVeri ? "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" : undefined}
        >
          Min bedrooms
        </Label>
        <select
          id="beds"
          name="beds"
          defaultValue={searchParams.get("beds") ?? ""}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isVeri && "mt-2 h-11 rounded-full border-foreground/15 px-4"
          )}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label
          htmlFor="maxRent"
          className={isVeri ? "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" : undefined}
        >
          Max rent (£pcm)
        </Label>
        <Input
          id="maxRent"
          name="maxRent"
          type="number"
          min={0}
          step={25}
          inputMode="numeric"
          defaultValue={searchParams.get("maxRent") ?? ""}
          placeholder="Any"
          className={isVeri ? "mt-2 h-11 rounded-full border-foreground/15 bg-background" : undefined}
        />
      </div>
      <div>
        <Label
          htmlFor="town"
          className={isVeri ? "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" : undefined}
        >
          Area
        </Label>
        <Input
          id="town"
          name="town"
          defaultValue={searchParams.get("town") ?? ""}
          placeholder="Town or area"
          className={isVeri ? "mt-2 h-11 rounded-full border-foreground/15 bg-background" : undefined}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="submit"
          className={cn(
            "w-full",
            isVeri &&
              "h-11 rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
