/**
 * Late rent interest (Tenant Fees Act 2019). Older settings may still carry
 * grace_days / fixed_amount / percent; those are ignored because a fixed late fee
 * isn't a permitted payment.
 */
export interface LateFeeRules {
  enabled?: boolean;
  /** Bank of England base rate, % a year. Interest isn't charged until this is set. */
  base_rate?: number | null;
  /** Margin over base, % a year, capped at 3. */
  margin?: number | null;
  grace_days?: number;
  fixed_amount?: number | null;
  percent?: number | null;
}

export interface BranchSettings {
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  maintenance_inbox_token?: string;
  alert_email?: string;
  /** Who gets certificate / inspection / pet request alerts: "admins" (default) or "everyone". */
  compliance_alerts?: "admins" | "everyone";
  /** Default management fee; landlords can have their own rate. */
  management_fee_percent?: number;
  /** Agency is VAT registered: VAT is added to fees charged to landlords. */
  vat_registered?: boolean;
  vat_rate?: number;
  /** Automatic arrears emails (and texts when SMS is set up) to tenants. */
  arrears_reminders?: { enabled?: boolean; sms?: boolean };
  late_fee_rules?: LateFeeRules;
  work_order_approval_threshold?: number;
  default_maintenance_sla_hours?: number;
  /** Client money account details shown to tenants for standing orders */
  client_account_name?: string;
  client_account_sort_code?: string;
  client_account_number?: string;
  /** Redress scheme membership (TPO or PRS), shown on agreements and checked before advertising. */
  redress_scheme?: "tpo" | "prs" | string;
  redress_member_number?: string;
  /** Block portal sync when the landlord has no PRS Database registration number. */
  require_prs_number?: boolean;
  /** Council tax, water and energy contacts for move-in / move-out notices. */
  utility_contacts?: { name: string; email: string }[];
  /** Month-end client account checks, keyed by "YYYY-MM". */
  client_account_checks?: Record<string, ClientAccountCheck>;
}

export interface ClientAccountCheck {
  bank_balance: number;
  expected: number;
  difference: number;
  saved_at: string;
}

export function parseBranchSettings(raw: unknown): BranchSettings {
  if (!raw || typeof raw !== "object") return {};
  return raw as BranchSettings;
}

export function getStripeAccountId(settings: BranchSettings): string | null {
  const id = settings.stripe_account_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function isStripeOnboardingComplete(settings: BranchSettings): boolean {
  return settings.stripe_onboarding_complete === true;
}

export function getMaintenanceInboxToken(settings: BranchSettings): string | null {
  const token = settings.maintenance_inbox_token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function getManagementFeePercent(settings: BranchSettings): number {
  const p = settings.management_fee_percent;
  return typeof p === "number" && p >= 0 ? p : 10;
}

export function getLateFeeRules(settings: BranchSettings): LateFeeRules {
  const r = settings.late_fee_rules ?? {};
  return {
    enabled: r.enabled !== false,
    base_rate: typeof r.base_rate === "number" ? r.base_rate : null,
    margin: typeof r.margin === "number" ? Math.min(Math.max(r.margin, 0), 3) : 3,
  };
}

/** VAT rate to add to agency fees, or 0 when the agency isn't VAT registered. */
export function getVatRate(settings: BranchSettings): number {
  if (!settings.vat_registered) return 0;
  return typeof settings.vat_rate === "number" && settings.vat_rate >= 0 ? settings.vat_rate : 20;
}

export function getWorkOrderApprovalThreshold(settings: BranchSettings): number {
  const t = settings.work_order_approval_threshold;
  return typeof t === "number" && t >= 0 ? t : 250;
}

export function getClientAccountDetails(settings: BranchSettings): {
  name: string | null;
  sortCode: string | null;
  accountNumber: string | null;
} {
  return {
    name:
      typeof settings.client_account_name === "string" && settings.client_account_name
        ? settings.client_account_name
        : null,
    sortCode:
      typeof settings.client_account_sort_code === "string" && settings.client_account_sort_code
        ? settings.client_account_sort_code
        : null,
    accountNumber:
      typeof settings.client_account_number === "string" && settings.client_account_number
        ? settings.client_account_number
        : null,
  };
}
