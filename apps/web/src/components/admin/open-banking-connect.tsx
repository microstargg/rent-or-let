"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface OpenBankingConnection {
  id: string;
  bank: string | null;
  accountName: string | null;
  accountNumberMask: string | null;
  status: string;
  lastSyncedAt: string | null;
  consentExpiresAt: string | null;
}

interface Bank {
  name: string;
  country: string;
  beta: boolean;
}

function formatWhen(iso: string | null) {
  if (!iso) return "never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDay(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export function OpenBankingConnect({
  connections,
  notice,
  noticeError,
}: {
  connections: OpenBankingConnection[];
  notice?: string | null;
  noticeError?: string | null;
}) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [bank, setBank] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [error, setError] = useState<string | null>(noticeError ?? null);

  const active = connections.filter((c) => c.status === "active");
  const lapsed = connections.filter((c) => c.status === "expired");

  async function loadBanks() {
    setPicking(true);
    setError(null);
    if (banks) return;
    setBusy("banks");
    try {
      const res = await fetch("/api/admin/bank-feed/enable-banking");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load banks");
      setBanks(data.banks);
      if (!data.banks.length) {
        setError("Enable Banking returned no banks for this app. Check the app is active in the Enable Banking control panel.");
      }
      const mock = (data.banks as Bank[]).find((b) => /mock/i.test(b.name));
      if (mock) setBank(mock.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load banks");
    } finally {
      setBusy(null);
    }
  }

  async function post(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/admin/bank-feed/enable-banking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function connect() {
    if (!bank) return;
    const chosen = banks?.find((b) => b.name === bank);
    setBusy("connect");
    setError(null);
    try {
      const data = await post("connect", { bank, country: chosen?.country });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start connecting");
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const d = await post("sync");
      const parts = [
        `${d.imported} new line(s) from ${d.accounts} account(s), ${d.duplicates} already imported.`,
        `${d.matched} matched to tenants, ${d.exceptions} sent to Exceptions.`,
        `Money out: ${d.outgoingMatched} matched to payouts or jobs, ${d.outgoingUnmatched} not recognised.`,
      ];
      if (d.pendingSkipped) parts.push(`${d.pendingSkipped} pending line(s) left until they clear.`);
      setMessage(parts.join(" "));
      if (d.errors?.length) setError(d.errors.join(" · "));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(id: string) {
    if (!window.confirm("Stop reading this bank account? Lines already imported are kept.")) return;
    setBusy(`disconnect:${id}`);
    setError(null);
    try {
      await post("disconnect", { id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Bank feed (open banking)</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Connect the client account once and pull transactions straight from the bank, instead of
            downloading a statement. Read-only: LetFlow can see transactions but cannot move money.
          </p>
        </div>
        {active.length > 0 && (
          <Button type="button" size="sm" className="min-h-10" disabled={busy !== null} onClick={() => void sync()}>
            {busy === "sync" ? "Pulling transactions…" : "Sync now"}
          </Button>
        )}
      </div>

      {connections.length > 0 && (
        <ul className="mt-3 divide-y rounded-lg border">
          {connections.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{c.bank ?? "Bank"}</span>
                {" · "}
                {c.accountName ?? "Account"}
                {c.accountNumberMask ? ` ${c.accountNumberMask}` : ""}
                <div className="text-xs text-muted-foreground">
                  {c.status === "active"
                    ? `Last synced ${formatWhen(c.lastSyncedAt)}${
                        c.consentExpiresAt ? ` · access until ${formatDay(c.consentExpiresAt)}` : ""
                      }`
                    : c.status === "expired"
                      ? "Access has ended. Connect again to keep syncing."
                      : "Disconnected"}
                </div>
              </div>
              {c.status === "active" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => void disconnect(c.id)}
                >
                  {busy === `disconnect:${c.id}` ? "Disconnecting…" : "Disconnect"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!picking ? (
          <Button
            type="button"
            size="sm"
            variant={active.length ? "outline" : "default"}
            className="min-h-10"
            disabled={busy !== null}
            onClick={() => void loadBanks()}
          >
            {active.length ? "Connect another account" : lapsed.length ? "Reconnect bank" : "Connect bank"}
          </Button>
        ) : (
          <>
            <select
              className="min-h-10 rounded-md border bg-background px-2 text-sm"
              value={bank}
              disabled={!banks || busy !== null}
              onChange={(e) => setBank(e.target.value)}
            >
              <option value="">{banks ? "Choose your bank…" : "Loading banks…"}</option>
              {banks?.map((b) => (
                <option key={`${b.country}:${b.name}`} value={b.name}>
                  {b.name}
                  {b.country ? ` (${b.country})` : ""}
                  {b.beta ? " · beta" : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              className="min-h-10"
              disabled={!bank || busy !== null}
              onClick={() => void connect()}
            >
              {busy === "connect" ? "Opening bank…" : "Continue to bank"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => setPicking(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
