"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/admin/admin-page";

const selectClass = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export interface RegisterPanelInfo {
  region: string | null;
  regionGuessed: boolean;
  regionLabel: string | null;
  opens: string | null;
  deadline: string | null;
  propertyNumber: string | null;
  registeredAt: string | null;
  isLet: boolean;
  regions: { value: string; label: string }[];
}

export interface RequirementRow {
  key: string;
  label: string;
  reason: string;
  status: string;
  expiresAt: string | null;
  tenancyLabel: string | null;
  required: boolean;
}

function ukDate(iso: string | null) {
  return iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
}

/** What this property needs, what's on file, and the settings that decide it. */
export function PropertyCompliancePanel({
  propertyId,
  gasSupply,
  licensing,
  rows,
  register,
}: {
  propertyId: string;
  gasSupply: boolean;
  licensing: string | null;
  rows: RequirementRow[];
  register: RegisterPanelInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState(register.propertyNumber ?? "");
  const [registeredAt, setRegisteredAt] = useState(register.registeredAt ?? "");

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't save");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Gas supply
          <select
            className={selectClass}
            value={gasSupply ? "yes" : "no"}
            disabled={busy}
            onChange={(e) => save({ gas_supply: e.target.value === "yes" })}
          >
            <option value="yes">Yes, needs a gas safety record</option>
            <option value="no">No gas at the property</option>
          </select>
        </label>
        <label className="text-sm">
          Council licensing
          <select
            className={selectClass}
            value={licensing ?? ""}
            disabled={busy}
            onChange={(e) => save({ licensing: e.target.value || null })}
          >
            <option value="">Not in a licensing scheme</option>
            <option value="selective">Selective licensing</option>
            <option value="hmo">Mandatory HMO licence</option>
            <option value="additional">Additional HMO licensing</option>
          </select>
        </label>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium">Landlord register</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {register.regionLabel
            ? `${register.regionLabel}${register.regionGuessed ? " (from postcode)" : ""}: registration opens ${ukDate(register.opens)}, deadline ${ukDate(register.deadline)}.`
            : "Region unknown. Pick it below to see the deadline."}{" "}
          {register.isLet ? "Let properties must be registered by the deadline." : "Not let, so not needed until it's marketed."}{" "}
          The landlord starts the registration; they can send you a link to add certificates.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Region
            <select
              className={selectClass}
              value={register.regionGuessed ? "" : (register.region ?? "")}
              disabled={busy}
              onChange={(e) => save({ prs_region: e.target.value || null })}
            >
              <option value="">{register.regionGuessed ? `From postcode (${register.regionLabel})` : "Not set"}</option>
              {register.regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Property number
            <input
              className={selectClass}
              placeholder="P-XXXX-XXXX"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Date registered
            <input
              type="date"
              className={selectClass}
              value={registeredAt}
              onChange={(e) => setRegisteredAt(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            save({ prs_property_number: number.trim() || null, prs_registered_at: registeredAt || null })
          }
        >
          Save register details
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {r.label}
                {r.tenancyLabel ? <span className="text-muted-foreground"> · {r.tenancyLabel}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.expiresAt ? `${r.status === "expired" ? "Due" : "Expires"} ${ukDate(r.expiresAt)}. ` : ""}
                {r.reason}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
