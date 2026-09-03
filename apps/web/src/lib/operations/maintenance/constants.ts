export const WORKS_INVOICE_TYPE = "maintenance";
export const WORKS_INVOICE_PENDING = "pending_statement";
export const WORKS_INVOICE_BILLED = "billed";

const TENANT_PAYABLE_TYPES = new Set(["rent", "late_fee"]);

export function isTenantPayableInvoiceType(type: string): boolean {
  return TENANT_PAYABLE_TYPES.has(type);
}

export function isWorksInvoiceType(type: string): boolean {
  return type === WORKS_INVOICE_TYPE;
}

export function invoiceTypeLabel(type: string): string {
  if (type === WORKS_INVOICE_TYPE) return "Works";
  if (type === "late_fee") return "Late fee";
  if (type === "rent") return "Rent";
  return type.replaceAll("_", " ");
}
