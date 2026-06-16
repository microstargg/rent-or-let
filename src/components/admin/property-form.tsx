"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PropertyPortalChecklist } from "@/components/admin/property-portal-checklist";
import { PORTAL_LIMITS } from "@/lib/portals/portal-readiness";
import type { Property } from "@/types";
import { slugify } from "@/lib/utils";

interface PropertyFormProps {
  property?: Property;
  imageCount?: number;
  onSuccess: (id: string) => void;
}

const defaultBranchId = "00000000-0000-0000-0000-000000000001";

function CharCount({
  value,
  max,
  warnAt,
}: {
  value: string;
  max: number;
  warnAt?: number;
}) {
  const len = value.length;
  const over = len > max;
  const warn = warnAt !== undefined && len > warnAt && !over;

  return (
    <p
      className={`mt-1 text-xs ${
        over ? "text-red-600" : warn ? "text-amber-600" : "text-muted-foreground"
      }`}
    >
      {len.toLocaleString()} / {max.toLocaleString()} characters
      {over && " — too long for portals"}
    </p>
  );
}

export function PropertyForm({ property, imageCount = 0, onSuccess }: PropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    agent_ref: property?.agent_ref ?? "",
    house_name_number: property?.house_name_number ?? "",
    street: property?.street ?? "",
    postcode: property?.postcode ?? "",
    summary: property?.summary ?? "",
    description: property?.description ?? "",
    features: property?.features?.join("\n") ?? "",
    status: property?.status ?? "draft",
  });

  const featureList = useMemo(
    () =>
      draft.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    [draft.features]
  );

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

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
      floorplan_url: (formData.get("floorplan_url") as string) || null,
      epc_url: (formData.get("epc_url") as string) || null,
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
      <PropertyPortalChecklist
        input={{
          agent_ref: draft.agent_ref,
          house_name_number: draft.house_name_number,
          street: draft.street,
          postcode: draft.postcode,
          summary: draft.summary,
          description: draft.description,
          features: featureList,
          status: draft.status,
          imageCount,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="agent_ref">Agent reference</Label>
          <Input
            id="agent_ref"
            name="agent_ref"
            value={draft.agent_ref}
            onChange={(e) => updateDraft("agent_ref", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={draft.status}
            onChange={(e) => updateDraft("status", e.target.value)}
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
            value={draft.house_name_number}
            onChange={(e) => updateDraft("house_name_number", e.target.value)}
            placeholder="e.g. 12"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Required for accurate portal address matching.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            name="street"
            value={draft.street}
            onChange={(e) => updateDraft("street", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="town">Town</Label>
          <Input id="town" name="town" defaultValue={property?.town ?? "Middlesbrough"} required />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            name="postcode"
            value={draft.postcode}
            onChange={(e) => updateDraft("postcode", e.target.value)}
            required
          />
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
            <option value="commercial">Commercial</option>
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
        <Input
          id="summary"
          name="summary"
          value={draft.summary}
          onChange={(e) => updateDraft("summary", e.target.value)}
        />
        <CharCount value={draft.summary} max={PORTAL_LIMITS.summary} warnAt={250} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          value={draft.description}
          onChange={(e) => updateDraft("description", e.target.value)}
          required
        />
        <CharCount
          value={draft.description}
          max={PORTAL_LIMITS.description}
          warnAt={12000}
        />
      </div>

      <div>
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          name="features"
          rows={4}
          value={draft.features}
          onChange={(e) => updateDraft("features", e.target.value)}
        />
        <p
          className={`mt-1 text-xs ${
            featureList.length > PORTAL_LIMITS.features
              ? "text-amber-600"
              : "text-muted-foreground"
          }`}
        >
          {featureList.length} / {PORTAL_LIMITS.features} sent to portals
        </p>
      </div>

      <div className="space-y-4 rounded-xl border p-4">
        <h3 className="font-medium">Media &amp; documents</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="epc_rating">EPC rating</Label>
            <Input
              id="epc_rating"
              name="epc_rating"
              defaultValue={property?.epc_rating ?? ""}
              placeholder="e.g. D"
            />
          </div>
          <div>
            <Label htmlFor="virtual_tour_url">Virtual tour URL</Label>
            <Input
              id="virtual_tour_url"
              name="virtual_tour_url"
              type="url"
              defaultValue={property?.virtual_tour_url ?? ""}
              placeholder="https://"
            />
          </div>
          <div>
            <Label htmlFor="floorplan_url">Floorplan URL</Label>
            <Input
              id="floorplan_url"
              name="floorplan_url"
              type="url"
              defaultValue={property?.floorplan_url ?? ""}
              placeholder="https://"
            />
          </div>
          <div>
            <Label htmlFor="epc_url">EPC certificate URL</Label>
            <Input
              id="epc_url"
              name="epc_url"
              type="url"
              defaultValue={property?.epc_url ?? ""}
              placeholder="https://"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Floorplan and EPC URLs are sent to Rightmove and OnTheMarket as separate media
          items when set.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : property ? "Update property" : "Create property"}
      </Button>
    </form>
  );
}
