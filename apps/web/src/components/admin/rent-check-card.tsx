"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";

export interface RentCheckItem {
  invoiceId: string;
  tenancyId: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: string;
  renterName: string;
  propertyAddress: string;
  paymentRef: string | null;
  bankConfirmed: boolean;
}

const OVERDUE_SHOWN = 8;

function daysLate(dueDate: string, today: string): number {
  return Math.round(
    (new Date(`${today}T12:00:00Z`).getTime() - new Date(`${dueDate}T12:00:00Z`).getTime()) / 86400000
  );
}

function RentRow({ item, today }: { item: RentCheckItem; today: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "part">("idle");
  const [amount, setAmount] = useState(item.outstanding.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paid = item.status === "paid";
  const late = item.dueDate < today ? daysLate(item.dueDate, today) : 0;

  async function record(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${item.invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save that");
        return;
      }
      setMode("idle");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/tenancies/${item.tenancyId}?tab=money`} className="font-medium hover:underline">
          {item.propertyAddress}
        </Link>
        <p className="text-sm text-muted-foreground">
          {item.renterName}
          {item.paymentRef ? ` · ref ${item.paymentRef}` : ""}
          {late > 0 && <span className="text-red-700">{` · ${late} ${late === 1 ? "day" : "days"} late`}</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="tabular-nums font-medium">
          {formatMoney(paid ? item.amount : item.outstanding)}
          {item.status === "partial" && <span className="font-normal text-muted-foreground"> left</span>}
        </span>
        {paid ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              item.bankConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-emerald-50 text-emerald-700"
            )}
          >
            {item.bankConfirmed ? "Received · bank confirmed" : "Received"}
          </span>
        ) : mode === "part" ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(amount);
              if (!Number.isFinite(value) || value <= 0) {
                setError("Enter an amount above £0");
                return;
              }
              void record(
                value >= item.outstanding - 0.004 ? { action: "mark_paid" } : { action: "partial_pay", amount: value }
              );
            }}
          >
            <label className="sr-only" htmlFor={`rc-${item.invoiceId}`}>
              Amount received
            </label>
            <Input
              id={`rc-${item.invoiceId}`}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 w-28"
            />
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => void record({ action: "mark_paid" })}>
              {busy ? "Saving…" : "Yes, it's in"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setMode("part")}>
              Different amount
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600 sm:basis-full">{error}</p>}
    </li>
  );
}

/**
 * The daily bank check: what rent is due today, a tick for each one that has landed,
 * and anything from earlier days still not marked as received.
 */
export function RentCheckCard({
  today,
  dueToday,
  overdue,
  overdueTotal,
}: {
  today: string;
  dueToday: RentCheckItem[];
  overdue: RentCheckItem[];
  overdueTotal: number;
}) {
  const [showReceived, setShowReceived] = useState(false);
  const waiting = dueToday.filter((r) => r.status !== "paid");
  const received = dueToday.filter((r) => r.status === "paid");
  const waitingTotal = waiting.reduce((s, r) => s + r.outstanding, 0);

  return (
    <section className="mt-6 rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Rent due today</h2>
          <p className="text-sm text-muted-foreground">
            {dueToday.length === 0
              ? "No rent is due today."
              : waiting.length === 0
                ? `All ${dueToday.length} marked as received.`
                : `${waiting.length} of ${dueToday.length} still to check · ${formatMoney(waitingTotal)}. Check the bank and mark each one that has come in.`}
          </p>
        </div>
        <Link href="/finance/invoices?status=to_collect" className="text-sm text-primary hover:underline">
          All rent to collect
        </Link>
      </div>

      {waiting.length > 0 && (
        <ul className="divide-y">
          {waiting.map((r) => (
            <RentRow key={r.invoiceId} item={r} today={today} />
          ))}
        </ul>
      )}

      {received.length > 0 && (
        <div className="border-t px-4 py-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => setShowReceived((v) => !v)}
          >
            {showReceived ? "Hide" : "Show"} {received.length} received today
          </button>
        </div>
      )}
      {showReceived && received.length > 0 && (
        <ul className="divide-y border-t">
          {received.map((r) => (
            <RentRow key={r.invoiceId} item={r} today={today} />
          ))}
        </ul>
      )}

      {overdue.length > 0 && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t bg-red-50/60 px-4 py-2.5 dark:bg-red-950/20">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Overdue · {overdue.length} not received · {formatMoney(overdueTotal)}
            </h3>
            {overdue.length > OVERDUE_SHOWN && (
              <Link href="/finance/invoices?status=overdue" className="text-sm text-primary hover:underline">
                See all {overdue.length}
              </Link>
            )}
          </div>
          <ul className="divide-y">
            {overdue.slice(0, OVERDUE_SHOWN).map((r) => (
              <RentRow key={r.invoiceId} item={r} today={today} />
            ))}
          </ul>
        </>
      )}

      {dueToday.length > 0 && waiting.length > 0 && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Anything not marked today shows as overdue tomorrow. The weekly bank statement upload on Month end double-checks every tick.
        </p>
      )}
    </section>
  );
}
