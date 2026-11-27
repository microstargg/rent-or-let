"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function useFinanceAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save that");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  return { run, busy, error };
}

/** The bank shows a different amount from what was ticked: which is right? */
export function BankMismatchActions({ exceptionId }: { exceptionId: string }) {
  const { run, busy, error } = useFinanceAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() => run("use_bank", { action: "bank_mismatch", exceptionId, choice: "use_bank" })}
        >
          {busy === "use_bank" ? "Saving…" : "Bank is right"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("keep_tick", { action: "bank_mismatch", exceptionId, choice: "keep_tick" })}
        >
          {busy === "keep_tick" ? "Saving…" : "Keep what was marked"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** A tick the uploaded statement doesn't show. */
export function TickNotInBankActions({
  paymentId,
  bankLines,
}: {
  paymentId: string;
  /** Unmatched bank money of the same amount, to pair by hand. */
  bankLines: { id: string; label: string }[];
}) {
  const { run, busy, error } = useFinanceAction();
  const [line, setLine] = useState(bankLines[0]?.id ?? "");
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {bankLines.length > 0 && (
          <>
            <select
              aria-label="Bank line"
              className="h-9 max-w-[16rem] rounded-md border bg-background px-2 text-sm"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            >
              {bankLines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy !== null || !line}
              onClick={() => run("link", { action: "link_tick", paymentId, bankTransactionId: line })}
            >
              {busy === "link" ? "Saving…" : "This is it"}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("undo", { action: "undo_tick", paymentId })}
        >
          {busy === "undo" ? "Saving…" : "Not received: undo"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => run("dismiss", { action: "dismiss_tick", paymentId })}
        >
          It&apos;s fine
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
