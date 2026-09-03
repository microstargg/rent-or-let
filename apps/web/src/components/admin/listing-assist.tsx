"use client";

import { useMemo, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { scanListingCopy } from "@/lib/listings/discrimination-scan";

export function ListingAssist({
  propertyId,
  summary,
  description,
  features,
  onCopy,
  formRef,
}: {
  propertyId?: string;
  summary: string;
  description: string;
  features: string[];
  onCopy: (copy: { summary: string; description: string }) => void;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [epcChoices, setEpcChoices] = useState<
    { lmkKey: string; address: string; currentRating: string; certificateUrl: string }[]
  >([]);

  const scan = useMemo(
    () => scanListingCopy({ summary, description, features }),
    [summary, description, features]
  );

  async function generate() {
    if (!formRef.current) return;
    setBusy("copy");
    setMessage(null);
    const fd = new FormData(formRef.current);
    const res = await fetch("/api/admin/ai/listing-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        town: fd.get("town"),
        postcode: fd.get("postcode"),
        displayAddress: `${fd.get("street")}, ${fd.get("town")}`,
        bedrooms: Number(fd.get("bedrooms")),
        bathrooms: Number(fd.get("bathrooms")),
        propertyType: fd.get("property_type"),
        furnished: fd.get("furnished"),
        pricePcm: Number(fd.get("price_pcm")),
        features,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not generate copy");
      return;
    }
    onCopy({ summary: data.summary, description: data.description });
    setMessage("Draft inserted — edit before publishing.");
  }

  async function lookupEpc(apply?: string) {
    if (!formRef.current) return;
    setBusy("epc");
    setMessage(null);
    const fd = new FormData(formRef.current);
    const res = await fetch("/api/admin/epc/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        postcode: fd.get("postcode"),
        house_name_number: fd.get("house_name_number"),
        street: fd.get("street"),
        apply: Boolean(apply),
        lmk_key: apply,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "EPC lookup failed");
      setEpcChoices(data.matches ?? []);
      return;
    }
    if (data.applied) {
      const rating = document.getElementById("epc_rating") as HTMLInputElement | null;
      const url = document.getElementById("epc_url") as HTMLInputElement | null;
      if (rating) rating.value = data.applied.currentRating;
      if (url) url.value = data.applied.certificateUrl;
      setMessage(`EPC ${data.applied.currentRating} applied (${data.applied.address}).`);
      setEpcChoices([]);
      return;
    }
    setEpcChoices(data.matches ?? []);
    setMessage(data.best ? "Matched a certificate — apply from the list if it looks right." : "Pick a certificate.");
  }

  async function overrideScan() {
    if (!propertyId) {
      setMessage("Save the property first, then you can override the scan.");
      return;
    }
    setBusy("scan");
    const res = await fetch(`/api/admin/properties/${propertyId}/listing-scan-override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, description, features }),
    });
    const data = await res.json();
    setBusy(null);
    setMessage(res.ok ? "Override recorded for this wording. Portal sync will proceed." : data.error);
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={generate}>
          {busy === "copy" ? "Generating…" : "Generate listing copy"}
        </Button>
        <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => lookupEpc()}>
          {busy === "epc" ? "Looking up…" : "Look up EPC"}
        </Button>
      </div>
      {scan.blocked && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-950">Listing scan flagged wording</p>
          <ul className="mt-1 list-disc pl-5 text-amber-900">
            {scan.hits.map((hit) => (
              <li key={hit.phrase}>
                <strong>{hit.phrase}</strong> — {hit.reason}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={Boolean(busy)}
            onClick={overrideScan}
          >
            Record staff override
          </Button>
        </div>
      )}
      {epcChoices.length > 0 && (
        <ul className="space-y-1 text-sm">
          {epcChoices.map((c) => (
            <li key={c.lmkKey} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1">
              <span>
                {c.address} · {c.currentRating}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => lookupEpc(c.lmkKey)}>
                Apply
              </Button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
