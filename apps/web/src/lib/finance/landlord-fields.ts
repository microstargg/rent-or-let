/** Map the landlord API's money fields to the database columns (undefined = leave as is). */
export function landlordMoneyFields(body: {
  service_level?: string | null;
  fee_percent?: number | null;
  letting_fee?: number | null;
  nrl_status?: string | null;
  nrl_approval_ref?: string | null;
}) {
  return {
    ...(body.service_level !== undefined && { serviceLevel: body.service_level || null }),
    ...(body.fee_percent !== undefined && { feePercent: body.fee_percent == null ? null : String(body.fee_percent) }),
    ...(body.letting_fee !== undefined && { lettingFee: body.letting_fee == null ? null : String(body.letting_fee) }),
    ...(body.nrl_status !== undefined && { nrlStatus: body.nrl_status || null }),
    ...(body.nrl_approval_ref !== undefined && { nrlApprovalRef: body.nrl_approval_ref?.trim() || null }),
  };
}
