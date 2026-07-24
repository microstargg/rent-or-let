export interface LateFeeRules {
  enabled?: boolean;
  /** Days after due date before late fee applies */
  grace_days?: number;
  /** Fixed fee in GBP, or null to use percent */
  fixed_amount?: number | null;
  /** Percent of invoice amount (e.g. 5 = 5%) */
  percent?: number | null;
}

export interface BranchSettings {
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  maintenance_inbox_token?: string;
  alert_email?: string;
  management_fee_percent?: number;
  late_fee_rules?: LateFeeRules;
  work_order_approval_threshold?: number;
  default_maintenance_sla_hours?: number;
  /** Preferred client-money Open Banking connection id */
  bank_feed_connection_id?: string;
  bank_feed_enabled?: boolean;
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
  return settings.late_fee_rules ?? { enabled: true, grace_days: 7, fixed_amount: 25, percent: null };
}

export function getWorkOrderApprovalThreshold(settings: BranchSettings): number {
  const t = settings.work_order_approval_threshold;
  return typeof t === "number" && t >= 0 ? t : 250;
}

export function getBankFeedConnectionId(settings: BranchSettings): string | null {
  const id = settings.bank_feed_connection_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function isBankFeedEnabled(settings: BranchSettings): boolean {
  return settings.bank_feed_enabled === true;
}
