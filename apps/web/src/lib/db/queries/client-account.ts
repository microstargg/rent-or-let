import { and, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq } from "../agency-scope";
import { ensureBankFeed } from "./bank-feed";
import {
  bankTransactions,
  landlordLedgerEntries,
  landlordPayouts,
  paymentExceptions,
} from "../schema";
import { getBranchWithSettings, updateBranchSettings } from "./operations";
import { parseBranchSettings, type ClientAccountCheck } from "@/lib/branch-settings";
import type { MonthPeriod } from "./month-end";

function money(v: unknown): number {
  return Math.round(Number(v ?? 0) * 100) / 100;
}

/**
 * What the client account should hold at the end of the period, from the records.
 * Deposits are held by the deposit schemes, so they are not part of it.
 *
 *   owed to landlords
 * + money in not yet allocated (open exceptions)
 * + management fees + works charged to landlords   (agency money until moved out)
 * − contractor payments seen in the bank
 * − other payments out marked as expected (fee transfers, bank charges…)
 * + payouts recorded but not yet in the bank      (timing)
 */
export async function getClientAccountCheck(branchId: string, period: MonthPeriod) {
  await ensureBankFeed();
  const end = new Date(`${period.to}T23:59:59.999Z`);

  const [ledger] = await db
    .select({
      landlords: sql<string>`coalesce(sum(${landlordLedgerEntries.amount}), 0)`,
      fees: sql<string>`coalesce(sum(-${landlordLedgerEntries.amount}) filter (where ${landlordLedgerEntries.entryType} = 'management_fee'), 0)`,
      works: sql<string>`coalesce(sum(-${landlordLedgerEntries.amount}) filter (where ${landlordLedgerEntries.entryType} = 'work_order_cost'), 0)`,
    })
    .from(landlordLedgerEntries)
    .where(
      and(
        eq(landlordLedgerEntries.branchId, branchId),
        agencyEq(landlordLedgerEntries.agencyId),
        lte(landlordLedgerEntries.occurredAt, end)
      )
    );

  const [exceptions] = await db
    .select({ total: sql<string>`coalesce(sum(${paymentExceptions.amount}), 0)` })
    .from(paymentExceptions)
    .where(
      and(
        eq(paymentExceptions.branchId, branchId),
        agencyEq(paymentExceptions.agencyId),
        eq(paymentExceptions.status, "open"),
        lte(paymentExceptions.createdAt, end)
      )
    );

  const [out] = await db
    .select({
      contractors: sql<string>`coalesce(sum(-${bankTransactions.amount}) filter (where ${bankTransactions.workOrderId} is not null), 0)`,
      other: sql<string>`coalesce(sum(-${bankTransactions.amount}) filter (where ${bankTransactions.matchStatus} = 'ignored'), 0)`,
      unexplained: sql<string>`coalesce(sum(-${bankTransactions.amount}) filter (where ${bankTransactions.matchStatus} in ('unmatched', 'pending')), 0)`,
    })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.branchId, branchId),
        agencyEq(bankTransactions.agencyId),
        sql`${bankTransactions.amount} < 0`,
        lte(bankTransactions.bookedAt, end)
      )
    );

  // Payouts recorded by the period end whose bank line is missing or dated after it.
  const [inTransit] = await db
    .select({ total: sql<string>`coalesce(sum(${landlordPayouts.amount}), 0)` })
    .from(landlordPayouts)
    .leftJoin(bankTransactions, eq(bankTransactions.landlordPayoutId, landlordPayouts.id))
    .where(
      and(
        eq(landlordPayouts.branchId, branchId),
        agencyEq(landlordPayouts.agencyId),
        lte(landlordPayouts.paidAt, end),
        sql`(${bankTransactions.id} is null or ${bankTransactions.bookedAt} > ${end.toISOString()})`
      )
    );

  const lines = [
    { label: "Owed to landlords", amount: money(ledger?.landlords) },
    { label: "Money in not yet allocated (exceptions)", amount: money(exceptions?.total) },
    { label: "Management fees taken", amount: money(ledger?.fees) },
    { label: "Works charged to landlords", amount: money(ledger?.works) },
    { label: "Less: paid to contractors", amount: -money(out?.contractors) },
    { label: "Less: other payments out marked as expected", amount: -money(out?.other) },
    { label: "Payouts recorded but not yet in the bank", amount: money(inTransit?.total) },
  ];
  const expected = money(lines.reduce((s, l) => s + l.amount, 0));

  const branch = await getBranchWithSettings(branchId);
  const checks = parseBranchSettings(branch?.settings).client_account_checks ?? {};
  const saved = checks[period.month] ?? null;
  const previous =
    Object.entries(checks)
      .filter(([month]) => month < period.month)
      .sort(([a], [b]) => b.localeCompare(a))[0]?.[1] ?? null;

  return {
    lines,
    expected,
    unexplainedOut: money(out?.unexplained),
    saved,
    previous,
    suggestedBalance: await closingBalanceFromStatement(branchId, end),
  };
}

/** Running balance on the last bank line up to the period end, if the CSV had a Balance column. */
async function closingBalanceFromStatement(branchId: string, end: Date): Promise<number | null> {
  const rows = await db
    .select({ bookedAt: bankTransactions.bookedAt, raw: bankTransactions.raw })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.branchId, branchId),
        agencyEq(bankTransactions.agencyId),
        lte(bankTransactions.bookedAt, end),
        isNotNull(sql`${bankTransactions.raw}->>'balance'`)
      )
    )
    .orderBy(desc(bankTransactions.bookedAt))
    .limit(20);
  if (!rows.length) return null;
  const lastDay = rows[0]!.bookedAt.getTime();
  const balances = new Set(
    rows
      .filter((r) => r.bookedAt.getTime() === lastDay)
      .map((r) => Number((r.raw as { balance?: number }).balance))
  );
  // Several lines on the last day: we can't tell which came last, so don't guess.
  if (balances.size !== 1) return null;
  const [only] = [...balances];
  return Number.isFinite(only) ? only! : null;
}

export async function saveClientAccountCheck(
  branchId: string,
  period: MonthPeriod,
  bankBalance: number
): Promise<ClientAccountCheck> {
  const { expected } = await getClientAccountCheck(branchId, period);
  const branch = await getBranchWithSettings(branchId);
  const checks = parseBranchSettings(branch?.settings).client_account_checks ?? {};
  const entry: ClientAccountCheck = {
    bank_balance: money(bankBalance),
    expected,
    difference: money(bankBalance - expected),
    saved_at: new Date().toISOString(),
  };
  await updateBranchSettings(branchId, {
    client_account_checks: { ...checks, [period.month]: entry },
  });
  return entry;
}
