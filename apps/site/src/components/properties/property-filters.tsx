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
      router.push(`/properties?${params.toString()}`);
    },
    [router]
  );

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
