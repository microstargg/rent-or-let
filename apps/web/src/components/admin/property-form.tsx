"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, CircleAlert, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPortalReadiness, PORTAL_LIMITS } from "@/lib/portals/portal-readiness";
import {
  COUNCIL_TAX_BANDS,
  LET_TYPES,
  PETS_OPTIONS,
  TENANCY_INFO_MAX,
  type ListingDetails,
} from "@/lib/listings/listing-details";
import type { Property, PropertyStatus } from "@/types";
import { cn, formatCurrency, slugify } from "@/lib/utils";
import { ListingAssist } from "@/components/admin/listing-assist";
import { PropertyImageUpload, RECOMMENDED_PHOTOS } from "@/components/admin/property-image-upload";

interface PropertyFormProps {
  property?: Property;
  imageCount?: number;
  onSuccess: (id: string) => void;
}

const defaultBranchId = "00000000-0000-0000-0000-000000000001";

/** Portals cap each key feature at 200 characters. */
const FEATURE_MAX = 200;

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

type SectionId = "basic" | "details" | "media";

const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: "basic", label: "Basic information", hint: "Address, type and price" },
  { id: "details", label: "Details", hint: "Summary, key features, description, tenancy" },
  { id: "media", label: "Media", hint: "Photos, floorplan, EPC, virtual tour" },
];

/** Which section each portal check lives in, so the checklist can jump to it. */
const CHECK_SECTION: Record<string, SectionId> = {
  agent_ref: "basic",
  house_number: "basic",
  street: "basic",
  postcode: "basic",
  summary: "details",
  description: "details",
  features: "details",
  photos: "media",
};

const STATUS_OPTIONS: { value: PropertyStatus; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Not advertised anywhere" },
  { value: "available", label: "Available", hint: "Live on your site and portals" },
  { value: "let_agreed", label: "Let agreed", hint: "Taken off the portals" },
  { value: "archived", label: "Archived", hint: "Off the market" },
];

function CharCount({ value, max, warnAt }: { value: string; max: number; warnAt?: number }) {
  const len = value.length;
  const over = len > max;
  const warn = warnAt !== undefined && len > warnAt && !over;
  return (
    <span className={cn("text-xs", over ? "text-red-600" : warn ? "text-amber-600" : "text-muted-foreground")}>
      {len.toLocaleString()} / {max.toLocaleString()}
      {over && " (too long for portals)"}
    </span>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  counter,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  counter?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
        </Label>
        {counter}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function pretty(s: string): string {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * The listing editor. Laid out like the Rightmove and OnTheMarket agent tools:
 * Basic information / Details / Media steps on the left, and a status, checklist
 * and publish box on the right.
 */
export function PropertyForm({ property, imageCount = 0, onSuccess }: PropertyFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [section, setSection] = useState<SectionId>("basic");
  const [loading, setLoading] = useState<"save" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [landlords, setLandlords] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [d, setD] = useState({
    agent_ref: property?.agent_ref ?? "",
    house_name_number: property?.house_name_number ?? "",
    street: property?.street ?? "",
    town: property?.town ?? "Middlesbrough",
    postcode: property?.postcode ?? "",
    landlord_id: property?.landlord_id ?? "",
    is_vacant: property?.is_vacant ?? true,
    property_type: property?.property_type ?? "terraced",
    bedrooms: String(property?.bedrooms ?? 1),
    bathrooms: String(property?.bathrooms ?? 1),
    furnished: property?.furnished ?? "unfurnished",
    price_pcm: property?.price_pcm ? String(property.price_pcm) : "",
    deposit: property?.deposit !== undefined ? String(property.deposit) : "",
    holding_deposit: property?.holding_deposit !== undefined ? String(property.holding_deposit) : "",
    available_from: property?.available_from?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    summary: property?.summary ?? "",
    description: property?.description ?? "",
    epc_rating: property?.epc_rating ?? "",
    epc_url: property?.epc_url ?? "",
    floorplan_url: property?.floorplan_url ?? "",
    virtual_tour_url: property?.virtual_tour_url ?? "",
    status: (property?.status ?? "draft") as PropertyStatus,
  });
  const [features, setFeatures] = useState<string[]>(
    property?.features?.length ? property.features : [""]
  );
  const [listing, setListing] = useState<ListingDetails>({
    letType: property?.listing?.letType ?? "long_term",
    minTenancyMonths: property?.listing?.minTenancyMonths ?? null,
    councilTaxBand: property?.listing?.councilTaxBand ?? null,
    pets: property?.listing?.pets ?? null,
    billsIncluded: property?.listing?.billsIncluded ?? false,
    tenancyInfo: property?.listing?.tenancyInfo ?? "",
  });

  useEffect(() => {
    fetch("/api/admin/landlords")
      .then((r) => r.json())
      .then((rows) => setLandlords(Array.isArray(rows) ? rows : []))
      .catch(() => setLandlords([]));
  }, []);

  function set<K extends keyof typeof d>(field: K, value: (typeof d)[K]) {
    setD((current) => ({ ...current, [field]: value }));
  }
  function setL<K extends keyof ListingDetails>(field: K, value: ListingDetails[K]) {
    setListing((current) => ({ ...current, [field]: value }));
  }

  const featureList = useMemo(() => features.map((f) => f.trim()).filter(Boolean), [features]);
  const readiness = getPortalReadiness({
    agent_ref: d.agent_ref,
    house_name_number: d.house_name_number,
    street: d.street,
    postcode: d.postcode,
    summary: d.summary,
    description: d.description,
    features: featureList,
    status: "available",
    imageCount,
  });
  const missing = readiness.items.filter((i) => !i.ok);

  const sectionDone: Record<SectionId, boolean> = {
    basic:
      Boolean(d.agent_ref.trim() && d.house_name_number.trim() && d.street.trim() && d.town.trim()) &&
      UK_POSTCODE.test(d.postcode.trim()) &&
      Number(d.price_pcm) > 0 &&
      d.deposit !== "",
    details:
      Boolean(d.summary.trim() && d.description.trim()) &&
      d.summary.length <= PORTAL_LIMITS.summary &&
      featureList.length > 0 &&
      featureList.length <= PORTAL_LIMITS.features,
    media: imageCount > 0,
  };

  const displayAddress = [d.street, d.town, d.postcode].filter((p) => p.trim()).join(", ");
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section);

  function goTo(id: SectionId) {
    setSection(id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveFeature(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= features.length) return;
    setFeatures((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const goLive = submitter?.value === "live";

    // Fields can sit on a step that isn't showing: open that step, then point at the field.
    if (!form.checkValidity()) {
      const bad = form.querySelector<HTMLInputElement>("input:invalid, textarea:invalid, select:invalid");
      const owner = bad?.closest<HTMLElement>("[data-section]")?.dataset.section as SectionId | undefined;
      if (owner) setSection(owner);
      requestAnimationFrame(() => bad?.reportValidity());
      return;
    }

    const status: PropertyStatus = goLive ? "available" : d.status;
    setLoading(goLive ? "live" : "save");
    setError(null);

    const payload = {
      branch_id: property?.branch_id ?? defaultBranchId,
      agent_ref: d.agent_ref.trim(),
      slug:
        property?.slug ??
        slugify([d.house_name_number, d.street, d.town, d.postcode].filter(Boolean).join(" ")),
      display_address: displayAddress,
      house_name_number: d.house_name_number.trim(),
      street: d.street.trim(),
      town: d.town.trim(),
      postcode: d.postcode.trim().toUpperCase(),
      price_pcm: Number(d.price_pcm),
      deposit: Number(d.deposit),
      holding_deposit: d.holding_deposit !== "" ? Number(d.holding_deposit) : null,
      available_from: d.available_from,
      bedrooms: Number(d.bedrooms),
      bathrooms: Number(d.bathrooms),
      property_type: d.property_type,
      furnished: d.furnished,
      status,
      description: d.description,
      summary: d.summary || null,
      features: featureList,
      epc_rating: d.epc_rating.trim().toUpperCase() || null,
      virtual_tour_url: d.virtual_tour_url.trim() || null,
      floorplan_url: d.floorplan_url.trim() || null,
      epc_url: d.epc_url.trim() || null,
      landlord_id: d.landlord_id || null,
      is_vacant: d.is_vacant,
      published_at: status === "available" ? new Date().toISOString() : null,
      listing: {
        letType: listing.letType ?? null,
        minTenancyMonths: listing.minTenancyMonths ?? null,
        councilTaxBand: listing.councilTaxBand ?? null,
        pets: listing.pets ?? null,
        billsIncluded: Boolean(listing.billsIncluded),
        tenancyInfo: listing.tenancyInfo?.trim() || null,
      },
    };

    try {
      const url = property ? `/api/admin/properties/${property.id}` : "/api/admin/properties";
      const res = await fetch(url, {
        method: property ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      if (goLive) set("status", "available");
      setSavedAt(new Date());
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(null);
    }
  }

  const live = d.status === "available";
  const sync = Object.entries(property?.portal_sync ?? {});

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 grid scroll-mt-4 gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]"
    >
      <div className="min-w-0 space-y-4">
        {/* Step tabs, like the portals' Basic information / Details / Media tabs. */}
        <nav aria-label="Listing sections" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
          {SECTIONS.map((s, i) => {
            const active = s.id === section;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors sm:px-3",
                  active ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    sectionDone[s.id]
                      ? "bg-green-600 text-white"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/15"
                  )}
                >
                  {sectionDone[s.id] ? <Check className="h-3.5 w-3.5" aria-label="Complete" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate font-medium", active && "text-foreground")}>{s.label}</span>
                  <span className="hidden truncate text-xs text-muted-foreground md:block">{s.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* 1. Basic information */}
        <div data-section="basic" className={cn("space-y-4", section !== "basic" && "hidden")}>
          <Card title="Address" description="Portals match listings on house number and postcode.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="house_name_number" label="House name or number" required>
                <Input
                  id="house_name_number"
                  name="house_name_number"
                  value={d.house_name_number}
                  onChange={(e) => set("house_name_number", e.target.value)}
                  placeholder="e.g. 12"
                  required
                />
              </Field>
              <Field id="street" label="Street" required className="sm:col-span-2">
                <Input id="street" name="street" value={d.street} onChange={(e) => set("street", e.target.value)} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="town" label="Town" required>
                <Input id="town" name="town" value={d.town} onChange={(e) => set("town", e.target.value)} required />
              </Field>
              <Field id="postcode" label="Postcode" required>
                <Input
                  id="postcode"
                  name="postcode"
                  value={d.postcode}
                  onChange={(e) => set("postcode", e.target.value)}
                  pattern="[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}"
                  title="A full UK postcode, e.g. TS1 3BA"
                  required
                />
              </Field>
            </div>
            {displayAddress && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Shown on portals as: </span>
                {displayAddress}
                <span className="text-muted-foreground"> (house number kept private)</span>
              </p>
            )}
          </Card>

          <Card title="Property">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="property_type" label="Property type" required>
                <select
                  id="property_type"
                  name="property_type"
                  value={d.property_type}
                  onChange={(e) => set("property_type", e.target.value as Property["property_type"])}
                  className={selectClass}
                >
                  <option value="terraced">Terraced house</option>
                  <option value="semi_detached">Semi-detached house</option>
                  <option value="detached">Detached house</option>
                  <option value="flat">Flat</option>
                  <option value="bungalow">Bungalow</option>
                  <option value="commercial">Commercial</option>
                </select>
              </Field>
              <Field id="furnished" label="Furnishing">
                <select
                  id="furnished"
                  name="furnished"
                  value={d.furnished}
                  onChange={(e) => set("furnished", e.target.value as Property["furnished"])}
                  className={selectClass}
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="part_furnished">Part furnished</option>
                  <option value="furnished">Furnished</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field id="bedrooms" label="Bedrooms" required hint="Use 0 for a studio.">
                <Input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min={0}
                  value={d.bedrooms}
                  onChange={(e) => set("bedrooms", e.target.value)}
                  required
                />
              </Field>
              <Field id="bathrooms" label="Bathrooms" required>
                <Input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min={1}
                  value={d.bathrooms}
                  onChange={(e) => set("bathrooms", e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="agent_ref" label="Agent reference" required hint="Your own reference. Sent to the portals.">
                <Input
                  id="agent_ref"
                  name="agent_ref"
                  value={d.agent_ref}
                  onChange={(e) => set("agent_ref", e.target.value)}
                  required
                />
              </Field>
              <Field id="landlord_id" label="Landlord">
                <select
                  id="landlord_id"
                  name="landlord_id"
                  value={d.landlord_id}
                  onChange={(e) => set("landlord_id", e.target.value)}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {/* Keep the linked landlord while the list loads (or if it fails), so saving can't unlink them. */}
                  {property?.landlord_id && !landlords.some((l) => l.id === property.landlord_id) && (
                    <option value={property.landlord_id}>Current landlord</option>
                  )}
                  {landlords.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Price and availability">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="price_pcm" label="Rent (£ pcm)" required>
                <Input
                  id="price_pcm"
                  name="price_pcm"
                  type="number"
                  min={1}
                  step={1}
                  value={d.price_pcm}
                  onChange={(e) => set("price_pcm", e.target.value)}
                  required
                />
              </Field>
              <Field id="deposit" label="Deposit (£)" required>
                <Input
                  id="deposit"
                  name="deposit"
                  type="number"
                  min={0}
                  value={d.deposit}
                  onChange={(e) => set("deposit", e.target.value)}
                  required
                />
              </Field>
              <Field id="holding_deposit" label="Holding deposit (£)">
                <Input
                  id="holding_deposit"
                  name="holding_deposit"
                  type="number"
                  min={0}
                  value={d.holding_deposit}
                  onChange={(e) => set("holding_deposit", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="available_from" label="Available from" required>
                <Input
                  id="available_from"
                  name="available_from"
                  type="date"
                  value={d.available_from}
                  onChange={(e) => set("available_from", e.target.value)}
                  required
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
                <input
                  id="is_vacant"
                  name="is_vacant"
                  type="checkbox"
                  checked={d.is_vacant}
                  onChange={(e) => set("is_vacant", e.target.checked)}
                  className="h-4 w-4"
                />
                Vacant (available to let)
              </label>
            </div>
          </Card>
        </div>

        {/* 2. Details */}
        <div data-section="details" className={cn("space-y-4", section !== "details" && "hidden")}>
          <Card
            title="Summary"
            description="The short text under the price in portal search results."
            action={<CharCount value={d.summary} max={PORTAL_LIMITS.summary} warnAt={200} />}
          >
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              value={d.summary}
              onChange={(e) => set("summary", e.target.value)}
              aria-label="Summary"
            />
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Search result preview
              </p>
              <p className="mt-1 font-semibold">
                {d.price_pcm ? `${formatCurrency(Number(d.price_pcm))} pcm` : "£— pcm"}
              </p>
              <p className="text-sm">
                {d.bedrooms === "0" ? "Studio" : `${d.bedrooms} bedroom`} {pretty(d.property_type).toLowerCase()}
                {d.property_type === "flat" || d.property_type === "bungalow" || d.property_type === "commercial"
                  ? ""
                  : " house"}
              </p>
              <p className="text-sm text-muted-foreground">{displayAddress || "Address"}</p>
              <p className="mt-1 line-clamp-3 text-sm">{d.summary || "Your summary shows here."}</p>
              {d.summary.length > 200 && (
                <p className="mt-1 text-xs text-amber-700">
                  Search results show about 200 characters, so put the best bits first.
                </p>
              )}
            </div>
            <ListingAssist
              mode="copy"
              propertyId={property?.id}
              summary={d.summary}
              description={d.description}
              features={featureList}
              formRef={formRef}
              onCopy={(copy) => setD((c) => ({ ...c, summary: copy.summary, description: copy.description }))}
            />
          </Card>

          <Card
            title="Key features"
            description="Bullet points shown near the top of the listing. Portals take up to 10."
            action={
              <span
                className={cn(
                  "text-xs",
                  featureList.length > PORTAL_LIMITS.features ? "text-amber-700" : "text-muted-foreground"
                )}
              >
                {featureList.length} / {PORTAL_LIMITS.features}
              </span>
            }
          >
            <ol className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-5 shrink-0 text-right text-xs tabular-nums",
                      i >= PORTAL_LIMITS.features ? "text-amber-700" : "text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <Input
                    value={f}
                    maxLength={FEATURE_MAX}
                    aria-label={`Key feature ${i + 1}`}
                    placeholder={i === 0 ? "e.g. Gas central heating" : ""}
                    onChange={(e) =>
                      setFeatures((current) => current.map((x, j) => (j === i ? e.target.value : x)))
                    }
                  />
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-8 p-0"
                      onClick={() => moveFeature(i, -1)}
                      disabled={i === 0}
                      aria-label="Move feature up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-8 p-0"
                      onClick={() => moveFeature(i, 1)}
                      disabled={i === features.length - 1}
                      aria-label="Move feature down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-8 p-0"
                      onClick={() =>
                        setFeatures((current) => (current.length > 1 ? current.filter((_, j) => j !== i) : [""]))
                      }
                      aria-label="Remove feature"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            {featureList.length > PORTAL_LIMITS.features && (
              <p className="text-xs text-amber-700">Only the first 10 are sent to the portals.</p>
            )}
            {features.length < PORTAL_LIMITS.features && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeatures((current) => [...current, ""])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add feature
              </Button>
            )}
          </Card>

          <Card
            title="Full description"
            description="Room by room details, location and anything a renter should know."
            action={<CharCount value={d.description} max={PORTAL_LIMITS.description} warnAt={12000} />}
          >
            <Textarea
              id="description"
              name="description"
              rows={12}
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
              aria-label="Full description"
              required
            />
            <p className="text-xs text-muted-foreground">
              Portals strip out phone numbers, email addresses, web links and phrases like &ldquo;No DSS&rdquo;.
            </p>
          </Card>

          <Card title="Letting details" description="The lettings information portals show beside the price.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="let_type" label="Let type">
                <select
                  id="let_type"
                  value={listing.letType ?? ""}
                  onChange={(e) => setL("letType", (e.target.value || null) as ListingDetails["letType"])}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {LET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="min_tenancy" label="Minimum tenancy (months)">
                <Input
                  id="min_tenancy"
                  type="number"
                  min={0}
                  max={60}
                  value={listing.minTenancyMonths ?? ""}
                  onChange={(e) => setL("minTenancyMonths", e.target.value === "" ? null : Number(e.target.value))}
                  placeholder="e.g. 6"
                />
              </Field>
              <Field id="council_tax_band" label="Council tax band">
                <select
                  id="council_tax_band"
                  value={listing.councilTaxBand ?? ""}
                  onChange={(e) =>
                    setL("councilTaxBand", (e.target.value || null) as ListingDetails["councilTaxBand"])
                  }
                  className={selectClass}
                >
                  <option value="">Not known</option>
                  {COUNCIL_TAX_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b === "Exempt" ? "Exempt" : `Band ${b}`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="pets" label="Pets">
                <select
                  id="pets"
                  value={listing.pets ?? ""}
                  onChange={(e) => setL("pets", (e.target.value || null) as ListingDetails["pets"])}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {PETS_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(listing.billsIncluded)}
                  onChange={(e) => setL("billsIncluded", e.target.checked)}
                  className="h-4 w-4"
                />
                Bills included in the rent
              </label>
            </div>
            <Field
              id="tenancy_info"
              label="Tenancy info"
              counter={<CharCount value={listing.tenancyInfo ?? ""} max={TENANCY_INFO_MAX} />}
              hint="Fees and permitted payments under the Tenant Fees Act 2019, e.g. holding deposit, default fees."
            >
              <Textarea
                id="tenancy_info"
                rows={4}
                maxLength={TENANCY_INFO_MAX}
                value={listing.tenancyInfo ?? ""}
                onChange={(e) => setL("tenancyInfo", e.target.value)}
              />
            </Field>
          </Card>
        </div>

        {/* 3. Media */}
        <div data-section="media" className={cn("space-y-4", section !== "media" && "hidden")}>
          <Card title="Photos" description="Portals show photos in this order. Lead with your best exterior shot.">
            {property ? (
              <PropertyImageUpload propertyId={property.id} images={property.images ?? []} />
            ) : (
              <p className="rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Save the property first, then add photos here.
              </p>
            )}
          </Card>

          <Card title="Floorplan, EPC and virtual tour" description="Each one goes to the portals as its own media item.">
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field id="epc_rating" label="EPC rating">
                <select
                  id="epc_rating"
                  name="epc_rating"
                  value={d.epc_rating.toUpperCase()}
                  onChange={(e) => set("epc_rating", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Not set</option>
                  {["A", "B", "C", "D", "E", "F", "G"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="epc_url" label="EPC certificate link">
                <Input
                  id="epc_url"
                  name="epc_url"
                  type="url"
                  value={d.epc_url}
                  onChange={(e) => set("epc_url", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
            <ListingAssist
              mode="epc"
              propertyId={property?.id}
              summary={d.summary}
              description={d.description}
              features={featureList}
              formRef={formRef}
              onCopy={() => {}}
              onEpc={(epc) => setD((c) => ({ ...c, epc_rating: epc.rating, epc_url: epc.url }))}
            />
            <Field id="floorplan_url" label="Floorplan link" hint="An image or PDF link. Floorplans get more enquiries.">
              <Input
                id="floorplan_url"
                name="floorplan_url"
                type="url"
                value={d.floorplan_url}
                onChange={(e) => set("floorplan_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field id="virtual_tour_url" label="Virtual tour or video link" hint="YouTube, Vimeo or a 360 tour link.">
              <Input
                id="virtual_tour_url"
                name="virtual_tour_url"
                type="url"
                value={d.virtual_tour_url}
                onChange={(e) => set("virtual_tour_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => goTo(SECTIONS[sectionIndex - 1].id)}
            className={cn(sectionIndex === 0 && "invisible")}
          >
            Back
          </Button>
          {sectionIndex < SECTIONS.length - 1 && (
            <Button type="button" variant="outline" onClick={() => goTo(SECTIONS[sectionIndex + 1].id)}>
              Next: {SECTIONS[sectionIndex + 1].label}
            </Button>
          )}
        </div>
      </div>

      {/* Right-hand box: status, what's missing, save / make live. */}
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Status</h3>
          </div>
          <fieldset className="space-y-1 p-2">
            <legend className="sr-only">Listing status</legend>
            {STATUS_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                  d.status === o.value ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="status"
                  value={o.value}
                  checked={d.status === o.value}
                  onChange={() => set("status", o.value)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Ready for the portals</h3>
            {readiness.ready ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Ready" />
            ) : (
              <span className="text-xs text-amber-800">{missing.length} to do</span>
            )}
          </div>
          <ul className="p-2 text-sm">
            {readiness.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSection(CHECK_SECTION[item.id] ?? "basic")}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/50"
                >
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  ) : (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  )}
                  <span className={item.ok ? "text-muted-foreground" : "font-medium text-amber-900"}>
                    {item.id === "photos" ? (imageCount ? `${imageCount} photos` : "At least one photo") : item.label}
                  </span>
                </button>
              </li>
            ))}
            {imageCount > 0 && imageCount < RECOMMENDED_PHOTOS && (
              <li className="px-2 py-1 text-xs text-muted-foreground">
                Tip: listings with {RECOMMENDED_PHOTOS}+ photos get more enquiries.
              </li>
            )}
          </ul>
        </section>

        <div className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!live && (
            <>
              <Button
                type="submit"
                value="live"
                className="w-full"
                disabled={Boolean(loading) || !readiness.ready}
                title={readiness.ready ? undefined : `Still needed: ${missing.map((m) => m.label).join(", ")}`}
              >
                {loading === "live" ? "Publishing…" : "Save & make live"}
              </Button>
              {!readiness.ready && (
                <p className="text-xs text-muted-foreground">
                  Finish the checklist to go live.
                  {!property && " Photos can be added once the property is saved."}
                </p>
              )}
            </>
          )}
          <Button
            type="submit"
            value="save"
            variant={live ? "default" : "outline"}
            className="w-full"
            disabled={Boolean(loading)}
          >
            {loading === "save"
              ? "Saving…"
              : !property
                ? d.status === "draft"
                  ? "Save as draft"
                  : "Create property"
                : live
                  ? "Save & update portals"
                  : "Save changes"}
          </Button>
          {savedAt && !loading && !error && (
            <p className="text-center text-xs text-green-700">
              Saved at {savedAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          {property && live && (
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href={`/properties/${property.slug}`} target="_blank">
                Preview on your site
              </Link>
            </Button>
          )}
        </div>

        {sync.length > 0 && (
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Portal sync</h3>
            </div>
            <dl className="space-y-2 p-4 text-sm">
              {sync.map(([portal, state]) => (
                <div key={portal}>
                  <dt className="font-medium capitalize">{portal}</dt>
                  <dd className={cn("text-xs", state.error ? "text-red-700" : "text-muted-foreground")}>
                    {pretty(state.status ?? "unknown")}
                    {state.last_synced_at && `, ${new Date(state.last_synced_at).toLocaleString("en-GB")}`}
                    {state.error && `. ${state.error}`}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </aside>
    </form>
  );
}
