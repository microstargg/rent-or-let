"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

interface OpenInvoiceOption {
  id: string;
  label: string;
  remaining: number;
}

export function UnmatchedExceptionActions({
  exceptionId,
  invoices,
  tenancies = [],
  suggestedInvoiceId,
}: {
  exceptionId: string;
  invoices: OpenInvoiceOption[];
  /** Tenancies the money can be held for as credit (tenant paid ahead, nothing due yet). */
  tenancies?: { id: string; label: string }[];
  suggestedInvoiceId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initial =
    (suggestedInvoiceId && invoices.some((i) => i.id === suggestedInvoiceId)
      ? suggestedInvoiceId
      : invoices[0]?.id) ?? "";
  const [invoiceId, setInvoiceId] = useState(initial);
  const [creditMode, setCreditMode] = useState(invoices.length === 0 && tenancies.length > 0);
  const [tenancyId, setTenancyId] = useState(tenancies[0]?.id ?? "");
  const selected = useMemo(
    () => invoices.find((i) => i.id === invoiceId) ?? null,
    [invoices, invoiceId]
  );

  async function allocate() {
    if (!invoiceId) return;
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "allocate_unmatched",
          exceptionId,
          invoiceId,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addCredit() {
    if (!tenancyId) return;
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credit_unmatched", exceptionId, tenancyId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function ignore() {
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ignore_unmatched", exceptionId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (creditMode) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <select
          className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
          value={tenancyId}
          onChange={(e) => setTenancyId(e.target.value)}
          disabled={loading}
        >
          {tenancies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" onClick={addCredit} disabled={loading || !tenancyId}>
            {loading ? "Saving…" : "Hold as tenant credit"}
          </Button>
          {invoices.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreditMode(false)} disabled={loading}>
              Match to rent instead
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={ignore} disabled={loading}>
            Ignore
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {invoices.length > 0 ? (
        <>
          <select
            className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            disabled={loading}
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.label} · {formatMoney(inv.remaining)} due
              </option>
            ))}
          </select>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" onClick={allocate} disabled={loading || !selected}>
              {loading ? "Saving…" : "Allocate"}
            </Button>
            {tenancies.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setCreditMode(true)} disabled={loading}>
                Hold as credit
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={ignore} disabled={loading}>
              Ignore
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={ignore} disabled={loading}>
          {loading ? "Saving…" : "Ignore (no open invoices)"}
        </Button>
      )}
    </div>
  );
}
