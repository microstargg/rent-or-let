import type {
  LandlordStatementPropertyTotals,
  LandlordStatementTotals,
  LandlordStatementWorkLine,
} from "@/lib/pdf/landlord-statement";

export type StatementLedgerLine = {
  propertyId: string | null;
  entryType: string;
  amount: number;
  work?: LandlordStatementWorkLine | null;
};

const UNALLOCATED = "__none__";

function emptyProperty(
  id: string | null,
  address: string
): LandlordStatementPropertyTotals {
  return {
    id,
    address,
    rent: 0,
    fees: 0,
    costs: 0,
    adjustments: 0,
    net: 0,
    works: [],
  };
}

function applyEntry(bucket: LandlordStatementPropertyTotals, entry: StatementLedgerLine) {
  const amt = Number(entry.amount) || 0;
  bucket.net += amt;
  if (entry.entryType === "rent_received") bucket.rent += amt;
  else if (entry.entryType === "management_fee") bucket.fees += amt;
  else if (entry.entryType === "work_order_cost") {
    bucket.costs += amt;
    if (entry.work) bucket.works.push(entry.work);
  } else bucket.adjustments += amt;
}

export function groupLandlordStatementTotals(input: {
  entries: StatementLedgerLine[];
  propertyAddressById: Map<string, string> | Record<string, string>;
}): LandlordStatementTotals {
  const addressOf = (id: string | null) => {
    if (!id) return "Unallocated";
    if (input.propertyAddressById instanceof Map) {
      return input.propertyAddressById.get(id) || "Property";
    }
    return input.propertyAddressById[id] || "Property";
  };

  const byProperty = new Map<string, LandlordStatementPropertyTotals>();
  const totals: LandlordStatementTotals = {
    rent: 0,
    fees: 0,
    costs: 0,
    adjustments: 0,
    net: 0,
    count: 0,
    works: [],
    properties: [],
  };

  for (const entry of input.entries) {
    const key = entry.propertyId ?? UNALLOCATED;
    const bucket =
      byProperty.get(key) ??
      emptyProperty(entry.propertyId, addressOf(entry.propertyId));
    applyEntry(bucket, entry);
    byProperty.set(key, bucket);

    totals.net = Number(totals.net) + (Number(entry.amount) || 0);
    totals.count = Number(totals.count) + 1;
    if (entry.entryType === "rent_received") totals.rent = Number(totals.rent) + Number(entry.amount);
    else if (entry.entryType === "management_fee") totals.fees = Number(totals.fees) + Number(entry.amount);
    else if (entry.entryType === "work_order_cost") {
      totals.costs = Number(totals.costs) + Number(entry.amount);
      if (entry.work) totals.works = [...(totals.works ?? []), entry.work];
    } else totals.adjustments = Number(totals.adjustments) + Number(entry.amount);
  }

  const properties = [...byProperty.values()].sort((a, b) => {
    if (!a.id && b.id) return 1;
    if (a.id && !b.id) return -1;
    return a.address.localeCompare(b.address);
  });

  totals.properties = properties;
  return totals;
}

export function statementHasPropertyBreakdown(totals: LandlordStatementTotals | null | undefined): boolean {
  return Array.isArray(totals?.properties) && totals.properties.length > 0;
}
