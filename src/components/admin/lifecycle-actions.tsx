"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TenancyOption {
  id: string;
  label: string;
  propertyId: string;
}

export function LifecycleActions({
  tenancies,
}: {
  tenancies: TenancyOption[];
}) {
  const router = useRouter();
  const [tenancyId, setTenancyId] = useState(tenancies[0]?.id ?? "");
  const [scheme, setScheme] = useState("DPS");
  const [reference, setReference] = useState("");
  const [proposedRent, setProposedRent] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(
    new Date(Date.now() + 61 * 86400000).toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => tenancies.find((t) => t.id === tenancyId),
    [tenancies, tenancyId]
  );

  async function post(action: string, body: Record<string, unknown>) {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issueText = Array.isArray(data.issues)
          ? data.issues.map((i: { message: string }) => i.message).join(" ")
          : "";
        setMessage(data.error ? `${data.error}${issueText ? ` — ${issueText}` : ""}` : "Action failed");
        return;
      }
      setMessage("Saved");
      if (action === "protect_deposit") setReference("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Protect a deposit</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Records the scheme reference and marks Prescribed Information as served.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="tenancy">Tenancy</Label>
            <select
              id="tenancy"
              value={tenancyId}
              onChange={(e) => setTenancyId(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select tenancy…</option>
              {tenancies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="scheme">Scheme</Label>
              <select
                id="scheme"
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="DPS">DPS</option>
                <option value="TDS">TDS</option>
                <option value="mydeposits">mydeposits</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reference">Protection reference</Label>
              <Input
                id="reference"
                className="mt-1.5"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. DPS-123456"
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={!tenancyId || !reference || loading === "protect_deposit"}
            onClick={() =>
              post("protect_deposit", {
                action: "protect_deposit",
                tenancy_id: tenancyId,
                scheme,
                reference,
              })
            }
          >
            {loading === "protect_deposit" ? "Saving…" : "Protect deposit"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Common actions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Uses the tenancy selected on the left. Bulk RRA applies to all active tenancies.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!selected || loading === "inspection"}
            onClick={() =>
              post("inspection", {
                action: "create_inspection",
                property_id: selected!.propertyId,
                tenancy_id: selected!.id,
                type: "move_in",
              })
            }
          >
            Create move-in inspection
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected || loading === "interim"}
            onClick={() =>
              post("interim", {
                action: "create_inspection",
                property_id: selected!.propertyId,
                tenancy_id: selected!.id,
                type: "interim",
                scheduled_at: new Date().toISOString(),
              })
            }
          >
            Schedule interim now
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="proposed_rent">Proposed rent (pcm)</Label>
              <Input
                id="proposed_rent"
                className="mt-1.5"
                inputMode="decimal"
                value={proposedRent}
                onChange={(e) => setProposedRent(e.target.value)}
                placeholder="e.g. 850"
              />
            </div>
            <div>
              <Label htmlFor="effective_at">Effective date</Label>
              <Input
                id="effective_at"
                className="mt-1.5"
                type="date"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!tenancyId || !proposedRent || loading === "notice"}
            onClick={() =>
              post("notice", {
                action: "create_notice",
                tenancy_id: tenancyId,
                type: "section_13",
                serve: true,
                proposed_rent: Number(proposedRent),
                effective_at: effectiveAt,
                acknowledge_warnings: true,
              })
            }
          >
            Serve Section 13 notice
          </Button>
          {tenancyId && (
            <Button asChild variant="secondary">
              <a href={`/api/admin/tenancies/${tenancyId}/evidence`} target="_blank" rel="noreferrer">
                Download evidence pack
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={loading === "bulk_rra"}
            onClick={() => post("bulk_rra", { action: "bulk_rra" })}
          >
            {loading === "bulk_rra" ? "Serving…" : "Bulk serve RRA info sheet"}
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
