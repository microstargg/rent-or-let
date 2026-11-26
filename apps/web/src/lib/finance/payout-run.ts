import { listLandlordBalances, listLandlords } from "@/lib/db/queries";
import { parseLandlordBank, type LandlordBank } from "@/lib/finance/landlord-fields";
import { displayPersonName } from "@/lib/person-name";

export interface PayoutDue {
  landlordId: string;
  name: string;
  amount: number;
  bank: LandlordBank | null;
  reference: string;
}

/** Bank reference for this month's payout, kept to the 18 characters UK banks allow. */
export function payoutReference(date = new Date()) {
  const month = date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Europe/London" });
  return `RENT ${month}`.toUpperCase().slice(0, 18);
}

/** Landlords owed money now, with where to pay them. */
export async function listPayoutsDue(branchId: string): Promise<PayoutDue[]> {
  const [balances, landlords] = await Promise.all([listLandlordBalances(branchId), listLandlords(branchId)]);
  const byId = new Map(landlords.map((l) => [l.id, l]));
  const reference = payoutReference();
  return balances
    .filter((b) => b.balance > 0.004)
    .map((b) => {
      const l = byId.get(b.landlordId);
      return {
        landlordId: b.landlordId,
        name: l ? displayPersonName(l.firstName, l.lastName) : b.name,
        amount: Math.round(b.balance * 100) / 100,
        bank: parseLandlordBank(l?.bankDetails),
        reference,
      };
    });
}
