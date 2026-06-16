"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Property } from "@/types";
import { slugify } from "@/lib/utils";

interface PropertyFormProps {
  property?: Property;
  onSuccess: (id: string) => void;
}

const defaultBranchId = "00000000-0000-0000-0000-000000000001";

export function PropertyForm({ property, onSuccess }: PropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const street = formData.get("street") as string;
    const town = formData.get("town") as string;
    const postcode = formData.get("postcode") as string;
    const displayAddress = `${street}, ${town}, ${postcode}`.replace(/^, /, "");

    const payload = {
      branch_id: property?.branch_id ?? defaultBranchId,
      agent_ref: formData.get("agent_ref") as string,
      slug: property?.slug ?? slugify(`${street}-${town}-${postcode}`),
      display_address: displayAddress,
      house_name_number: (formData.get("house_name_number") as string) || "",
      street,
      town,
      postcode,
      price_pcm: Number(formData.get("price_pcm")),
      deposit: Number(formData.get("deposit")),
      holding_deposit: formData.get("holding_deposit")
        ? Number(formData.get("holding_deposit"))
        : null,
      available_from: formData.get("available_from") as string,
      bedrooms: Number(formData.get("bedrooms")),
      bathrooms: Number(formData.get("bathrooms")),
      property_type: formData.get("property_type") as string,
      furnished: formData.get("furnished") as string,
      status: formData.get("status") as string,
      description: formData.get("description") as string,
      summary: (formData.get("summary") as string) || null,
      features: (formData.get("features") as string)
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      epc_rating: (formData.get("epc_rating") as string) || null,
      virtual_tour_url: (formData.get("virtual_tour_url") as string) || null,
      published_at:
        formData.get("status") === "available" ? new Date().toISOString() : null,
    };

    try {
      const url = property
        ? `/api/admin/properties/${property.id}`
        : "/api/admin/properties";
      const res = await fetch(url, {
        method: property ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="agent_ref">Agent reference</Label>
          <Input
            id="agent_ref"
            name="agent_ref"
            defaultValue={property?.agent_ref}
            required
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={property?.status ?? "draft"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="available">Available</option>
            <option value="let_agreed">Let agreed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="house_name_number">House no.</Label>
          <Input
            id="house_name_number"
            name="house_name_number"
            defaultValue={property?.house_name_number}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="street">Street</Label>
          <Input id="street" name="street" defaultValue={property?.street} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="town">Town</Label>
          <Input id="town" name="town" defaultValue={property?.town ?? "Middlesbrough"} required />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode</Label>
          <Input id="postcode" name="postcode" defaultValue={property?.postcode} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="price_pcm">Rent (£pcm)</Label>
          <Input
            id="price_pcm"
            name="price_pcm"
            type="number"
            min={0}
            step={1}
            defaultValue={property?.price_pcm}
            required
          />
        </div>
        <div>
          <Label htmlFor="deposit">Deposit (£)</Label>
          <Input
            id="deposit"
            name="deposit"
            type="number"
            min={0}
            defaultValue={property?.deposit}
            required
          />
        </div>
        <div>
          <Label htmlFor="holding_deposit">Holding deposit (£)</Label>
          <Input
            id="holding_deposit"
            name="holding_deposit"
            type="number"
            min={0}
            defaultValue={property?.holding_deposit ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={property?.bedrooms ?? 1}
            required
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={1}
            defaultValue={property?.bathrooms ?? 1}
            required
          />
        </div>
        <div>
          <Label htmlFor="property_type">Type</Label>
          <select
            id="property_type"
            name="property_type"
            defaultValue={property?.property_type ?? "terraced"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="terraced">Terraced</option>
            <option value="semi_detached">Semi-detached</option>
            <option value="detached">Detached</option>
            <option value="flat">Flat</option>
            <option value="bungalow">Bungalow</option>
          </select>
        </div>
        <div>
          <Label htmlFor="furnished">Furnished</Label>
          <select
            id="furnished"
            name="furnished"
            defaultValue={property?.furnished ?? "unfurnished"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="furnished">Furnished</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="part_furnished">Part furnished</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="available_from">Available from</Label>
        <Input
          id="available_from"
          name="available_from"
          type="date"
          defaultValue={
            property?.available_from?.split("T")[0] ??
            new Date().toISOString().split("T")[0]
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="summary">Summary</Label>
        <Input id="summary" name="summary" defaultValue={property?.summary ?? ""} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={property?.description}
          required
        />
      </div>

      <div>
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          name="features"
          rows={4}
          defaultValue={property?.features?.join("\n") ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="epc_rating">EPC rating</Label>
          <Input id="epc_rating" name="epc_rating" defaultValue={property?.epc_rating ?? ""} />
        </div>
        <div>
          <Label htmlFor="virtual_tour_url">Virtual tour URL</Label>
          <Input
            id="virtual_tour_url"
            name="virtual_tour_url"
            type="url"
            defaultValue={property?.virtual_tour_url ?? ""}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : property ? "Update property" : "Create property"}
      </Button>
    </form>
  );
}
