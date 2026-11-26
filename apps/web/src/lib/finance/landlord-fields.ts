/** Where the agency pays the landlord. Stored in landlords.bank_details (jsonb). */
export interface LandlordBank {
  accountName: string;
  sortCode: string;
  accountNumber: string;
}

/** Read stored bank details; null unless sort code and account number are both there. */
export function parseLandlordBank(raw: unknown): LandlordBank | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const sortDigits = str(r.sort_code).replace(/\D/g, "");
  const accountNumber = str(r.account_number).replace(/\s/g, "");
  if (!sortDigits || !accountNumber) return null;
  const sortCode = sortDigits.length === 6 ? sortDigits.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3") : str(r.sort_code);
  return { accountName: str(r.account_name), sortCode, accountNumber };
}

/** Map the landlord API's money fields to the database columns (undefined = leave as is). */
export function landlordMoneyFields(body: {
  service_level?: string | null;
  fee_percent?: number | null;
  letting_fee?: number | null;
  nrl_status?: string | null;
  nrl_approval_ref?: string | null;
  bank_details?: { account_name?: string | null; sort_code?: string | null; account_number?: string | null } | null;
}) {
  const bank = body.bank_details;
  return {
    ...(body.service_level !== undefined && { serviceLevel: body.service_level || null }),
    ...(body.fee_percent !== undefined && { feePercent: body.fee_percent == null ? null : String(body.fee_percent) }),
    ...(body.letting_fee !== undefined && { lettingFee: body.letting_fee == null ? null : String(body.letting_fee) }),
    ...(body.nrl_status !== undefined && { nrlStatus: body.nrl_status || null }),
    ...(body.nrl_approval_ref !== undefined && { nrlApprovalRef: body.nrl_approval_ref?.trim() || null }),
    ...(bank !== undefined && {
      bankDetails:
        bank && (bank.sort_code?.trim() || bank.account_number?.trim() || bank.account_name?.trim())
          ? {
              account_name: bank.account_name?.trim() ?? "",
              sort_code: bank.sort_code?.trim() ?? "",
              account_number: bank.account_number?.replace(/\s/g, "") ?? "",
            }
          : null,
    }),
  };
}
