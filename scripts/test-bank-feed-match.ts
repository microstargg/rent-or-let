/**
 * Pure match-engine tests — run with: npx tsx scripts/test-bank-feed-match.ts
 */
import { matchBankTransaction, type MatchCandidate } from "../src/lib/bank-feed/match";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const base: MatchCandidate[] = [
  {
    invoiceId: "11111111-1111-1111-1111-111111111111",
    tenancyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    amountDue: 1000,
    dueDate: "2026-07-01",
    renterName: "Alice Smith",
    propertyAddress: "12 High Street, London",
    agentRef: "PROP-12",
    remaining: 1000,
  },
  {
    invoiceId: "22222222-2222-2222-2222-222222222222",
    tenancyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    amountDue: 850,
    dueDate: "2026-07-01",
    renterName: "Bob Jones",
    propertyAddress: "5 Park Road, Manchester",
    agentRef: "PROP-5",
    remaining: 850,
  },
];

function main() {
  const byRef = matchBankTransaction(
    {
      amount: 1000,
      description: "Rent PROP-12 July",
      counterparty: null,
      bookedAt: new Date(),
    },
    base
  );
  assert(byRef.confidence === "high" && byRef.invoiceId === base[0].invoiceId, "agent ref + amount → high");

  const byName = matchBankTransaction(
    {
      amount: 850,
      description: "BOB JONES RENT",
      counterparty: null,
      bookedAt: new Date(),
    },
    base
  );
  assert(byName.confidence === "high" && byName.invoiceId === base[1].invoiceId, "name + amount → high");

  const ambiguous = matchBankTransaction(
    {
      amount: 1000,
      description: "FASTER PAYMENT",
      counterparty: null,
      bookedAt: new Date(),
    },
    [
      ...base,
      {
        ...base[0],
        invoiceId: "33333333-3333-3333-3333-333333333333",
        tenancyId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        renterName: "Carol Lee",
        agentRef: "PROP-99",
        propertyAddress: "9 Other St",
        remaining: 1000,
      },
    ]
  );
  assert(ambiguous.confidence === "none", "duplicate amounts without name → none");

  const uniqueAmount = matchBankTransaction(
    {
      amount: 850,
      description: "PAYMENT",
      counterparty: null,
      bookedAt: new Date(),
    },
    base
  );
  assert(
    uniqueAmount.confidence === "medium" && uniqueAmount.invoiceId === base[1].invoiceId,
    "unique amount alone → medium (needs human if no name)"
  );

  const byInvoiceId = matchBankTransaction(
    {
      amount: 50,
      description: `Payment for ${base[0].invoiceId}`,
      counterparty: null,
      bookedAt: new Date(),
    },
    base
  );
  assert(
    byInvoiceId.confidence === "high" && byInvoiceId.invoiceId === base[0].invoiceId,
    "invoice id in description → high"
  );

  console.log("All match-engine tests passed");
}

main();
