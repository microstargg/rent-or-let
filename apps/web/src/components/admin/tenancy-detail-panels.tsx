"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { periodLabel, type Section8Ground } from "@/lib/tenancy/section8";
import type { DepositReturn } from "@/lib/tenancy/deposits";
import type { PaymentPlan, PlanProgress } from "@/lib/finance/arrears";

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const card = "rounded-xl border bg-card p-5 shadow-sm";

function useTenancyAction(tenancyId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
    setBusy(String(body.action));
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenancies/${tenancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok && res.status !== 409) setMessage(String(data.error ?? "Something went wrong"));
      if (res.ok) router.refresh();
      return { ok: res.ok, status: res.status, data };
    } finally {
      setBusy(null);
    }
  }
  return { run, busy, message, setMessage };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ukDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB");
}

const RTR_METHODS: Record<string, string> = {
  manual: "Original documents",
  share_code: "Home Office share code",
  idsp: "Digital ID check (IDSP)",
};

export function TenancyPeoplePanel({
  tenancyId,
  tenants,
  guarantors,
  renterOptions,
}: {
  tenancyId: string;
  tenants: {
    partyId: string | null;
    renterId: string;
    name: string;
    email: string | null;
    rtrCheckedAt: string | null;
    rtrMethod: string | null;
    rtrExpiresAt: string | null;
  }[];
  guarantors: { id: string; name: string; email: string | null; phone: string | null; guarantees: string | null }[];
  renterOptions: { id: string; label: string }[];
}) {
  const { run, busy, message } = useTenancyAction(tenancyId);
  const [renterId, setRenterId] = useState("");
  const [rtrFor, setRtrFor] = useState<string | null>(null);
  const [rtr, setRtr] = useState({ checked_at: today(), method: "share_code", expires_at: "" });
  const [showGuarantor, setShowGuarantor] = useState(false);
  const [g, setG] = useState({ full_name: "", email: "", phone: "", address: "", guarantees_renter_id: "" });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="font-semibold">Tenants</h3>
        <ul className="mt-3 divide-y text-sm">
          {tenants.map((t) => {
            const expired = t.rtrExpiresAt && t.rtrExpiresAt < today();
            return (
              <li key={t.renterId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {t.name}
                    {!t.partyId && <span className="ml-2 text-xs text-muted-foreground">lead tenant</span>}
                  </span>
                  {t.partyId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => run({ action: "remove_party", party_id: t.partyId })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className={`mt-1 text-xs ${expired ? "text-red-600" : "text-muted-foreground"}`}>
                  Right to Rent:{" "}
                  {t.rtrCheckedAt
                    ? `checked ${ukDate(t.rtrCheckedAt)} (${RTR_METHODS[t.rtrMethod ?? ""] ?? t.rtrMethod})${t.rtrExpiresAt ? `, follow-up due ${ukDate(t.rtrExpiresAt)}` : ", no time limit"}`
                    : "not recorded"}{" "}
                  <button type="button" className="text-primary underline" onClick={() => setRtrFor(rtrFor === t.renterId ? null : t.renterId)}>
                    {t.rtrCheckedAt ? "Record new check" : "Record check"}
                  </button>
                </p>
                {rtrFor === t.renterId && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Checked on</Label>
                      <Input type="date" value={rtr.checked_at} onChange={(e) => setRtr({ ...rtr, checked_at: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">How</Label>
                      <select className={selectClass} value={rtr.method} onChange={(e) => setRtr({ ...rtr, method: e.target.value })}>
                        {Object.entries(RTR_METHODS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Permission ends (if time-limited)</Label>
                      <Input type="date" value={rtr.expires_at} onChange={(e) => setRtr({ ...rtr, expires_at: e.target.value })} />
                    </div>
                    <div className="sm:col-span-3">
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={async () => {
                          const r = await run({
                            action: "right_to_rent",
                            renter_id: t.renterId,
                            checked_at: rtr.checked_at,
                            method: rtr.method,
                            expires_at: rtr.expires_at || null,
                          });
                          if (r.ok) setRtrFor(null);
                        }}
                      >
                        Save check
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {renterOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Label htmlFor="joint" className="text-xs">
                Add a joint tenant
              </Label>
              <select id="joint" className={selectClass} value={renterId} onChange={(e) => setRenterId(e.target.value)}>
                <option value="">Choose a renter…</option>
                {renterOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              disabled={!renterId || busy !== null}
              onClick={async () => {
                const r = await run({ action: "add_joint_tenant", renter_id: renterId });
                if (r.ok) setRenterId("");
              }}
            >
              Add
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Joint tenants see the same rent, repairs and documents in the tenant portal once invited from Renters.
        </p>
      </div>

      <div className={card}>
        <h3 className="font-semibold">Guarantors</h3>
        {guarantors.length ? (
          <ul className="mt-3 divide-y text-sm">
            {guarantors.map((gu) => (
              <li key={gu.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <span className="font-medium">{gu.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[gu.guarantees && `for ${gu.guarantees}`, gu.email, gu.phone].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run({ action: "remove_party", party_id: gu.id })}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No guarantors.</p>
        )}
        {showGuarantor ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input value={g.full_name} onChange={(e) => setG({ ...g, full_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Guarantees</Label>
              <select className={selectClass} value={g.guarantees_renter_id} onChange={(e) => setG({ ...g, guarantees_renter_id: e.target.value })}>
                <option value="">All tenants</option>
                {tenants.map((t) => (
                  <option key={t.renterId} value={t.renterId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={g.address} onChange={(e) => setG({ ...g, address: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                size="sm"
                disabled={g.full_name.trim().length < 2 || busy !== null}
                onClick={async () => {
                  const r = await run({
                    action: "add_guarantor",
                    full_name: g.full_name,
                    email: g.email || null,
                    phone: g.phone || null,
                    address: g.address || null,
                    guarantees_renter_id: g.guarantees_renter_id || null,
                  });
                  if (r.ok) {
                    setShowGuarantor(false);
                    setG({ full_name: "", email: "", phone: "", address: "", guarantees_renter_id: "" });
                  }
                }}
              >
                Save guarantor
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowGuarantor(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowGuarantor(true)}>
            Add guarantor
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-red-600 lg:col-span-2">{message}</p>}
    </div>
  );
}

export function TenancyAgreementPanel({
  tenancyId,
  agreements,
}: {
  tenancyId: string;
  agreements: {
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    signatures: { id: string; role: string; name: string; signedAt: string | null }[];
  }[];
}) {
  const { run, busy, message } = useTenancyAction(tenancyId);
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState("");
  const [emailLinks, setEmailLinks] = useState(true);
  const [links, setLinks] = useState<{ role: string; fullName: string; email: string | null; url: string }[] | null>(null);
  const current = agreements.find((a) => a.status !== "cancelled");

  return (
    <div className={card}>
      {current ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium">{current.status === "signed" ? "Signed by everyone" : "Waiting for signatures"}</span>{" "}
              <span className="text-muted-foreground">
                (sent {ukDate(current.createdAt)}
                {current.completedAt ? `, completed ${ukDate(current.completedAt)}` : ""})
              </span>
            </p>
            <a href={`/api/agreements/${current.id}/pdf`} className="text-sm text-primary hover:underline">
              Download PDF
            </a>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {current.signatures.map((s) => (
              <li key={s.id} className="flex justify-between gap-4">
                <span>
                  {s.name} <span className="text-xs text-muted-foreground">{s.role}</span>
                </span>
                <span className={s.signedAt ? "text-emerald-600" : "text-muted-foreground"}>
                  {s.signedAt ? `Signed ${ukDate(s.signedAt)}` : "Waiting"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No agreement sent yet.</p>
      )}

      {links && (
        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="font-medium">Signing links (each is personal, copy any that weren&apos;t emailed)</p>
          <ul className="mt-2 space-y-2">
            {links.map((l) => (
              <li key={l.url}>
                <span className="text-muted-foreground">
                  {l.fullName} ({l.role}){l.email ? `, ${l.email}` : ""}:
                </span>{" "}
                <a href={l.url} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {l.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="extra-terms">Additional terms (optional)</Label>
            <Textarea
              id="extra-terms"
              className="mt-1.5"
              rows={5}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Anything specific to this property, e.g. garden maintenance or parking."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emailLinks} onChange={(e) => setEmailLinks(e.target.checked)} />
            Email signing links to tenants and guarantors
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={async () => {
                const r = await run({ action: "send_agreement", additional_terms: extra || null, email_links: emailLinks });
                if (r.ok) {
                  setLinks((r.data.links as typeof links) ?? null);
                  setOpen(false);
                }
              }}
            >
              {busy ? "Preparing…" : "Send for signing"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {current?.status === "sent" && (
            <p className="text-xs text-muted-foreground">Sending again cancels the unsigned version and its links.</p>
          )}
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          {current ? "Send a new version" : "Prepare agreement"}
        </Button>
      )}
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}

export function TenancyDepositPanel({
  tenancyId,
  deposit,
  scheme,
  reference,
  depositReturn,
}: {
  tenancyId: string;
  deposit: number;
  scheme: string | null;
  reference: string | null;
  depositReturn: DepositReturn | null;
}) {
  const { run, busy, message } = useTenancyAction(tenancyId);
  const [rows, setRows] = useState(
    depositReturn?.deductions.length
      ? depositReturn.deductions.map((d) => ({ reason: d.reason, amount: String(d.amount) }))
      : [{ reason: "", amount: "" }]
  );
  const [caseRef, setCaseRef] = useState(depositReturn?.dispute?.schemeCaseRef ?? "");
  const [outcome, setOutcome] = useState(depositReturn?.dispute?.outcome ?? "");

  if (!deposit) return <p className="text-sm text-muted-foreground">No deposit was taken for this tenancy.</p>;

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const status = depositReturn?.status;

  return (
    <div className={card}>
      <p className="text-sm text-muted-foreground">
        £{deposit.toFixed(2)} {reference ? `protected with ${scheme} (${reference})` : "— not recorded as protected"}.
        {status && (
          <span className="ml-1 font-medium text-foreground">
            Return {status}
            {depositReturn?.paidAt ? ` ${ukDate(depositReturn.paidAt)}` : ""}.
          </span>
        )}
      </p>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">Deductions</p>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Reason, e.g. cleaning (check-out report p.3)"
              value={r.reason}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))}
            />
            <Input
              className="w-28"
              type="number"
              min="0"
              step="0.01"
              placeholder="£"
              value={r.amount}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
          </div>
        ))}
        <button type="button" className="text-sm text-primary underline" onClick={() => setRows([...rows, { reason: "", amount: "" }])}>
          Add line
        </button>
        <p className="text-sm">
          To landlord <span className="font-medium tabular-nums">£{total.toFixed(2)}</span>, back to tenants{" "}
          <span className="font-medium tabular-nums">£{Math.max(0, deposit - total).toFixed(2)}</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run({
              action: "deposit_return",
              deductions: rows.filter((r) => r.reason.trim() && Number(r.amount) > 0).map((r) => ({ reason: r.reason, amount: Number(r.amount) })),
              status: "proposed",
            })
          }
        >
          Save proposal
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null || !status} onClick={() => run({ action: "deposit_return", status: "agreed" })}>
          Tenants agreed
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null || !status} onClick={() => run({ action: "deposit_return", status: "disputed" })}>
          Disputed
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null || !status} onClick={() => run({ action: "deposit_return", status: "paid" })}>
          Mark returned
        </Button>
      </div>
      {status === "disputed" && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <Input placeholder="Scheme case reference" value={caseRef} onChange={(e) => setCaseRef(e.target.value)} />
          <Input placeholder="Adjudication outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              run({
                action: "deposit_return",
                dispute: { scheme_case_ref: caseRef || undefined, outcome: outcome || undefined, resolved: Boolean(outcome) },
              })
            }
          >
            Save
          </Button>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        The scheme expects the deposit back within 10 days of agreeing the amounts.
      </p>
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}

export function TenancyNoticesPanel({
  tenancyId,
  notices,
  grounds,
  overdue,
  rent,
}: {
  tenancyId: string;
  notices: { id: string; type: string; servedAt: string | null; effectiveAt: string | null; pdfUrl: string | null }[];
  grounds: Section8Ground[];
  overdue: number;
  rent: number;
}) {
  const { run, busy, message, setMessage } = useTenancyAction(tenancyId);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [warnings, setWarnings] = useState<string[] | null>(null);

  async function serve(ack: boolean) {
    const r = await run({ action: "section_8", grounds: picked, details: details || null, acknowledge_warnings: ack });
    const check = r.data.check as { warnings?: string[]; earliestDate?: string } | undefined;
    if (r.status === 409) {
      setWarnings(check?.warnings ?? []);
      return;
    }
    if (r.ok) {
      setOpen(false);
      setPicked([]);
      setDetails("");
      setWarnings(null);
      setMessage(`Served. Proceedings can start from ${ukDate(check?.earliestDate)}.`);
    }
  }

  return (
    <div className={card}>
      {notices.length ? (
        <ul className="divide-y text-sm">
          {notices.map((n) => (
            <li key={n.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{n.type.replace("section_", "Section ").replaceAll("_", " ")}</span>{" "}
                <span className="text-muted-foreground">
                  served {ukDate(n.servedAt)}
                  {n.effectiveAt ? `, effective ${ukDate(n.effectiveAt)}` : ""}
                </span>
              </span>
              {n.pdfUrl && (
                <a href={n.pdfUrl} className="text-primary hover:underline">
                  PDF
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No notices served.</p>
      )}

      {open ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Overdue rent today: <span className="font-medium">£{overdue.toFixed(2)}</span> ({rent ? (overdue / rent).toFixed(1) : "0"} months)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {grounds.map((g) => (
              <label key={g.code} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.includes(g.code)}
                  onChange={(e) =>
                    setPicked(e.target.checked ? [...picked, g.code] : picked.filter((c) => c !== g.code))
                  }
                />
                <span>
                  <span className="font-medium">
                    Ground {g.code}: {g.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {g.mandatory ? "Mandatory" : "Discretionary"} · {periodLabel(g.period)} notice. {g.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="s8-details">Particulars</Label>
            <Textarea
              id="s8-details"
              className="mt-1.5"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why each ground applies, with dates and amounts."
            />
          </div>
          {warnings && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <Button size="sm" className="mt-2" disabled={busy !== null} onClick={() => serve(true)}>
                Serve anyway
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={!picked.length || busy !== null} onClick={() => serve(false)}>
              Check and serve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Notice periods follow the Renters&apos; Rights Act. Check the current Form 3 guidance before relying on this.
          </p>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          Serve Section 8 notice
        </Button>
      )}
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}

export function TenancyArrearsPanel({
  tenancyId,
  overdue,
  plan,
  progress,
  reminders,
}: {
  tenancyId: string;
  overdue: number;
  plan: PaymentPlan | null;
  progress: PlanProgress | null;
  reminders: { sent: number[]; lastSentAt?: string } | null;
}) {
  const { run, busy, message } = useTenancyAction(tenancyId);
  const [open, setOpen] = useState(false);
  const [instalment, setInstalment] = useState("");
  const [start, setStart] = useState(today());
  const [notes, setNotes] = useState("");
  const active = plan?.status === "active" ? plan : null;
  const months = Number(instalment) > 0 ? Math.ceil(overdue / Number(instalment)) : null;

  return (
    <div className={card}>
      <p className="text-sm">
        Overdue now: <span className="font-medium tabular-nums">£{overdue.toFixed(2)}</span>
        {reminders?.lastSentAt && (
          <span className="text-muted-foreground">
            {" "}
            · last automatic reminder {ukDate(reminders.lastSentAt)} (day {Math.max(...reminders.sent)})
          </span>
        )}
      </p>
      {active && progress ? (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            Payment plan: £{active.instalment.toFixed(2)} a month on top of rent from {ukDate(active.startDate)}
          </p>
          <p className={`mt-1 ${progress.onTrack ? "text-emerald-700" : "text-red-600"}`}>
            {progress.onTrack ? "On track" : "Behind"}: should owe £{progress.expectedBalance.toFixed(2)} by now, owes £
            {progress.actualBalance.toFixed(2)}. {progress.monthsLeft} instalments left.
          </p>
          {active.notes && <p className="mt-1 text-muted-foreground">{active.notes}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Automatic reminders pause while the plan is on track.</p>
          <Button size="sm" variant="ghost" className="mt-2" disabled={busy !== null} onClick={() => run({ action: "payment_plan", cancel: true })}>
            End plan
          </Button>
        </div>
      ) : overdue > 0 ? (
        open ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Extra each month (£)</Label>
              <Input type="number" min="1" step="0.01" value={instalment} onChange={(e) => setInstalment(e.target.value)} />
              {months && <p className="mt-1 text-xs text-muted-foreground">Clears in {months} months</p>}
            </div>
            <div>
              <Label className="text-xs">First payment</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button
                size="sm"
                disabled={!(Number(instalment) > 0) || busy !== null}
                onClick={async () => {
                  const r = await run({ action: "payment_plan", instalment: Number(instalment), start_date: start, notes: notes || null });
                  if (r.ok) setOpen(false);
                }}
              >
                Save plan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
            Agree a payment plan
          </Button>
        )
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Nothing overdue.</p>
      )}
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
