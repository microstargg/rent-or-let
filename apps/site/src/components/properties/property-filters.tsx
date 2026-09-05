"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-4"
    >
      <div>
        <Label htmlFor="beds">Min bedrooms</Label>
        <Input
          id="beds"
          name="beds"
          type="number"
          min={1}
          defaultValue={searchParams.get("beds") ?? ""}
          placeholder="Any"
        />
      </div>
      <div>
        <Label htmlFor="maxRent">Max rent (£pcm)</Label>
        <Input
          id="maxRent"
          name="maxRent"
          type="number"
          min={0}
          defaultValue={searchParams.get("maxRent") ?? ""}
          placeholder="Any"
        />
      </div>
      <div>
        <Label htmlFor="town">Area</Label>
        <Input
          id="town"
          name="town"
          defaultValue={searchParams.get("town") ?? ""}
          placeholder="e.g. Middlesbrough"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Search
        </Button>
      </div>
    </form>
  );
}
