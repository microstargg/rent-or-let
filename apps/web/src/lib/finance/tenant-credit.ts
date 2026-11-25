/** Opening balance a tenancy had when it moved over from a previous agent or system. */
export interface OpeningBalance {
  kind: "arrears" | "credit";
  amount: number;
  /** The date the figure was correct on (ISO). */
  asOf: string;
  note: string | null;
  /** Arrears: the opening arrears charge. */
  invoiceId: string | null;
  /** Credit: the opening credit payment. */
  paymentId: string | null;
  setAt: string;
}

export function parseOpeningBalance(raw: unknown): OpeningBalance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<OpeningBalance>;
  if ((o.kind !== "arrears" && o.kind !== "credit") || !(Number(o.amount) > 0) || !o.asOf) return null;
  return {
    kind: o.kind,
    amount: Number(o.amount),
    asOf: o.asOf,
    note: o.note ?? null,
    invoiceId: o.invoiceId ?? null,
    paymentId: o.paymentId ?? null,
    setAt: o.setAt ?? o.asOf,
  };
}

/** Whether an invoice is the opening arrears brought over, rather than rent raised here. */
export function isOpeningArrears(meta: unknown): boolean {
  return Boolean(meta && typeof meta === "object" && (meta as { opening_balance?: boolean }).opening_balance);
}
