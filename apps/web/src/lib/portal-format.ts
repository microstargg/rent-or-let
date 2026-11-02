/** £1,234.56 (or -£110.00) — portals show exact pounds and pence, unlike the rounded staff `formatCurrency`. */
export function formatMoney(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  const text = Math.abs(value).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 && text !== "0.00" ? "-" : ""}£${text}`;
}

export function humanize(value: string): string {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const COMPLIANCE_LABELS: Record<string, string> = {
  gas_safety: "Gas safety certificate",
  epc: "Energy performance certificate (EPC)",
  eicr: "Electrical safety report (EICR)",
  deposit_pi: "Deposit prescribed information",
  rra_info_sheet: "Renters' Rights Act information sheet",
  right_to_rent: "Right to rent check",
};

export function complianceLabel(type: string): string {
  return COMPLIANCE_LABELS[type] ?? humanize(type);
}
