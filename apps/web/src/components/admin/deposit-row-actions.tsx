"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Panel = "protect" | "s13" | null;

async function postLifecycle(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return null;
  const issues = Array.isArray(data.issues) ? data.issues.map((i: { message: string }) => i.message).join(" ") : "";
  return data.error ? `${data.error}${issues ? `: ${issues}` : ""}` : "That didn't work";
}

/** Actions for one tenancy on the deposit register, so nothing is done to the wrong tenancy. */
export function DepositRowActions({
  tenancyId,
  isProtected,
  currentRent,
}: {
  tenancyId: string;
  isProtected: boolean;
  currentRent?: number | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [scheme, setScheme] = useState("DPS");
  const [reference, setReference] = useState("");
  const [proposedRent, setProposedRent] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(new Date(Date.now() + 61 * 86400000).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(body: Record<string, unknown>) {
    setLoading(true);
    setMessage(null);
    const err = await postLifecycle(body);
    setLoading(false);
    if (err) {
      setMessage(err);
      return;
    }
    setPanel(null);
    setReference("");
    setProposedRent("");
    router.refresh();
  }

  const toggle = (p: Panel) => {
    setMessage(null);
    setPanel((cur) => (cur === p ? null : p));
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {!isProtected && (
          <Button type="button" size="sm" onClick={() => toggle("protect")}>
            Protect deposit
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => toggle("s13")}>
          Rent increase
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={`/api/admin/tenancies/${tenancyId}/evidence`} target="_blank" rel="noreferrer">
            Evidence pack
          </a>
        </Button>
      </div>

      {panel === "protect" && (
        <form
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reference.trim()) return;
            run({ action: "protect_deposit", tenancy_id: tenancyId, scheme, reference: reference.trim() });
          }}
        >
          <select
            aria-label="Scheme"
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="DPS">DPS</option>
            <option value="TDS">TDS</option>
            <option value="mydeposits">mydeposits</option>
            <option value="other">Other</option>
          </select>
          <Input
            aria-label="Protection reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Scheme reference"
            className="h-8 w-40"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={loading || !reference.trim()}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <p className="w-full text-right text-xs text-muted-foreground">
            Also marks the prescribed information as served.
          </p>
        </form>
      )}

      {panel === "s13" && (
        <form
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const rent = Number(proposedRent);
            if (!Number.isFinite(rent) || rent <= 0) return;
            run({
              action: "create_notice",
              tenancy_id: tenancyId,
              type: "section_13",
              serve: true,
              proposed_rent: rent,
              effective_at: effectiveAt,
              acknowledge_warnings: true,
            });
          }}
        >
          <Input
            aria-label="New rent a month"
            inputMode="decimal"
            value={proposedRent}
            onChange={(e) => setProposedRent(e.target.value)}
            placeholder={currentRent ? `Now £${currentRent}` : "New rent £"}
            className="h-8 w-32"
            autoFocus
          />
          <Input
            aria-label="Takes effect"
            type="date"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            className="h-8 w-40"
          />
          <Button type="submit" size="sm" disabled={loading || !proposedRent}>
            {loading ? "Serving…" : "Serve Section 13"}
          </Button>
        </form>
      )}

      {message && <p className="text-right text-xs text-red-600">{message}</p>}
    </div>
  );
}
