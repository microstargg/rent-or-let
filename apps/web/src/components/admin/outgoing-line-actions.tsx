"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Linkable {
  kind: "payout" | "contractor";
  id: string;
  amount: number;
  label: string;
  date: string;
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/finance/month-end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Action failed");
}

export function OutgoingLineActions({
  transactionId,
  amount,
  linkable,
}: {
  transactionId: string;
  amount: number;
  linkable: Linkable[];
}) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = Math.abs(amount);
  // Same amount first: most likely a typo in the name or a date outside the window.
  const options = [...linkable].sort(
    (a, b) => Math.abs(a.amount - paid) - Math.abs(b.amount - paid)
  );

  async function run(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      await post({ transaction_id: transactionId, ...body });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Link to payout or job"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Link to a payout or job…</option>
            {options.map((o) => (
              <option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>
                {o.label} · £{o.amount.toFixed(2)} · {o.date}
                {Math.abs(o.amount - paid) > 0.005 ? " (amount differs)" : ""}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="min-h-10"
            disabled={!link || loading}
            onClick={() => {
              const [link_kind, link_id] = link.split(":");
              void run({ action: "link_outgoing", link_kind, link_id });
            }}
          >
            Link
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="What was this payment?"
          placeholder="Or say what it was, e.g. fees to office account"
          className="min-h-10 min-w-0 flex-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-10"
          disabled={!note.trim() || loading}
          onClick={() => run({ action: "mark_expected", note })}
        >
          Mark as expected
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ReopenOutgoingButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await post({ action: "reopen_outgoing", transaction_id: transactionId });
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      Undo
    </Button>
  );
}
