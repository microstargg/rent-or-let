/** Agency fee maths shared by rent posting, letting fees and exports. */

export const SERVICE_LEVELS = [
  { value: "fully_managed", label: "Fully managed" },
  { value: "rent_collection", label: "Rent collection" },
  { value: "let_only", label: "Let only" },
] as const;

export type ServiceLevel = (typeof SERVICE_LEVELS)[number]["value"];

export function serviceLevelLabel(value: string | null | undefined): string {
  return SERVICE_LEVELS.find((s) => s.value === value)?.label ?? "Fully managed";
}

/** Net fee plus VAT, each rounded to the penny. */
export function feeWithVat(net: number, vatRate: number): { net: number; vat: number; gross: number } {
  const n = Math.round(net * 100) / 100;
  const vat = Math.round(n * (vatRate / 100) * 100) / 100;
  return { net: n, vat, gross: Math.round((n + vat) * 100) / 100 };
}

/** Management fee % for a landlord: let-only pays none, otherwise their own rate or the agency default. */
export function landlordFeePercent(
  landlord: { serviceLevel?: string | null; feePercent?: string | number | null } | null | undefined,
  agencyDefault: number
): number {
  if (landlord?.serviceLevel === "let_only") return 0;
  const own = landlord?.feePercent;
  if (own !== null && own !== undefined && own !== "" && Number.isFinite(Number(own))) return Number(own);
  return agencyDefault;
}
