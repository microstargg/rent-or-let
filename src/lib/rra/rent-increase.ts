export interface RentIncreaseInput {
  currentRent: number;
  proposedRent: number;
  tenancyStart: string;
  lastIncreaseDate?: string | null;
  serveDate: string;
  effectiveDate: string;
  epcRating?: string | null;
}

export interface RentIncreaseIssue {
  code: string;
  severity: "block" | "warn";
  message: string;
}

export interface RentIncreaseValidation {
  ok: boolean;
  issues: RentIncreaseIssue[];
}

function parseDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function validateRentIncrease(input: RentIncreaseInput): RentIncreaseValidation {
  const issues: RentIncreaseIssue[] = [];
  const serve = parseDay(input.serveDate);
  const effective = parseDay(input.effectiveDate);
  const start = parseDay(input.tenancyStart);
  const last = input.lastIncreaseDate ? parseDay(input.lastIncreaseDate) : null;

  if (!(input.proposedRent > input.currentRent)) {
    issues.push({
      code: "rent_not_higher",
      severity: "block",
      message: "Proposed rent must be higher than the current rent.",
    });
  }

  if (daysBetween(serve, effective) < 60) {
    issues.push({
      code: "notice_period",
      severity: "block",
      message: "The increase must take effect at least two months after the notice is served.",
    });
  }

  if (monthsBetween(start, serve) < 12) {
    issues.push({
      code: "too_soon_start",
      severity: "block",
      message: "A statutory rent increase cannot usually be served within 12 months of the tenancy start.",
    });
  }

  if (last && monthsBetween(last, serve) < 12) {
    issues.push({
      code: "too_soon_last",
      severity: "block",
      message: "A further statutory increase cannot usually be served within 12 months of the last increase.",
    });
  }

  const rating = (input.epcRating ?? "").trim().toUpperCase();
  if (rating === "F" || rating === "G") {
    issues.push({
      code: "epc_mees",
      severity: "warn",
      message: `EPC rating ${rating} may prevent lawful letting under MEES. Check before increasing rent.`,
    });
  }

  return {
    ok: !issues.some((i) => i.severity === "block"),
    issues,
  };
}
