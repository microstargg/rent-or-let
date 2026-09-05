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
        <Input
          id="beds"
          name="beds"
          type="number"
          min={1}
          defaultValue={searchParams.get("beds") ?? ""}
          placeholder="Any"
          className={isVeri ? "mt-2 h-11 rounded-full border-foreground/15 bg-background" : undefined}
        />
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
          placeholder="e.g. Durham, Newcastle"
          className={isVeri ? "mt-2 h-11 rounded-full border-foreground/15 bg-background" : undefined}
        />
      </div>
      <div className={isVeri ? "flex items-end" : "flex items-end"}>
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
