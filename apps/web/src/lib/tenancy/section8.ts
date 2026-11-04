/**
 * Section 8 (Housing Act 1988, as amended by the Renters' Rights Act 2025) grounds
 * an agency is most likely to use, with the minimum notice period for each.
 *
 * This is a checklist to stop obvious mistakes, not legal advice: staff should
 * still check the current Form 3 guidance before serving.
 */

export type NoticePeriod =
  | { kind: "immediate" }
  | { kind: "weeks"; weeks: number }
  | { kind: "months"; months: number };

export interface Section8Ground {
  code: string;
  title: string;
  mandatory: boolean;
  period: NoticePeriod;
  /** Possession date can't fall within the first 12 months of the tenancy. */
  protectedFirstYear?: boolean;
  /** Needs this many months of rent arrears when served (and at the hearing). */
  arrearsMonths?: number;
  hint: string;
}

export const SECTION_8_GROUNDS: Section8Ground[] = [
  {
    code: "1",
    title: "Landlord or family moving in",
    mandatory: true,
    period: { kind: "months", months: 4 },
    protectedFirstYear: true,
    hint: "Landlord, spouse/partner, parent, grandparent, sibling, child or grandchild needs the home.",
  },
  {
    code: "1A",
    title: "Landlord selling the property",
    mandatory: true,
    period: { kind: "months", months: 4 },
    protectedFirstYear: true,
    hint: "The property can't be re-let for 12 months after possession.",
  },
  {
    code: "2",
    title: "Mortgage lender repossessing",
    mandatory: true,
    period: { kind: "months", months: 4 },
    hint: "Lender is entitled to sell with vacant possession.",
  },
  {
    code: "6",
    title: "Substantial redevelopment",
    mandatory: true,
    period: { kind: "months", months: 4 },
    hint: "Works can't reasonably be done with the tenant in place.",
  },
  {
    code: "7A",
    title: "Serious anti-social behaviour conviction",
    mandatory: true,
    period: { kind: "immediate" },
    hint: "Conviction, injunction breach or closure order for the tenant or a visitor.",
  },
  {
    code: "8",
    title: "Serious rent arrears",
    mandatory: true,
    period: { kind: "weeks", weeks: 4 },
    arrearsMonths: 3,
    hint: "At least 3 months' rent owed when the notice is served and at the hearing. Universal Credit payments due but not yet paid don't count.",
  },
  {
    code: "10",
    title: "Some rent arrears",
    mandatory: false,
    period: { kind: "weeks", weeks: 4 },
    hint: "Some rent is owed when served and when proceedings start.",
  },
  {
    code: "11",
    title: "Persistent late payment",
    mandatory: false,
    period: { kind: "weeks", weeks: 4 },
    hint: "Rent has been paid late repeatedly, even if nothing is owed today.",
  },
  {
    code: "12",
    title: "Breach of tenancy terms",
    mandatory: false,
    period: { kind: "weeks", weeks: 2 },
    hint: "Any obligation other than paying rent.",
  },
  {
    code: "13",
    title: "Damage to the property",
    mandatory: false,
    period: { kind: "weeks", weeks: 2 },
    hint: "The condition has got worse because of the tenant or someone living with them.",
  },
  {
    code: "14",
    title: "Nuisance or anti-social behaviour",
    mandatory: false,
    period: { kind: "immediate" },
    hint: "Behaviour likely to cause nuisance or annoyance, or a relevant conviction.",
  },
  {
    code: "15",
    title: "Damage to furniture",
    mandatory: false,
    period: { kind: "weeks", weeks: 2 },
    hint: "Furniture provided under the tenancy has been damaged.",
  },
  {
    code: "17",
    title: "False statement to get the tenancy",
    mandatory: false,
    period: { kind: "weeks", weeks: 2 },
    hint: "The tenant knowingly or recklessly made a false statement.",
  },
];

export function getGround(code: string): Section8Ground | undefined {
  return SECTION_8_GROUNDS.find((g) => g.code === code);
}

export function periodLabel(period: NoticePeriod): string {
  if (period.kind === "immediate") return "Immediate";
  if (period.kind === "weeks") return `${period.weeks} weeks`;
  return `${period.months} months`;
}

function addPeriod(fromIso: string, period: NoticePeriod): string {
  const d = new Date(`${fromIso}T00:00:00Z`);
  if (period.kind === "weeks") d.setUTCDate(d.getUTCDate() + period.weeks * 7);
  if (period.kind === "months") d.setUTCMonth(d.getUTCMonth() + period.months);
  return d.toISOString().slice(0, 10);
}

function addMonths(fromIso: string, months: number): string {
  const d = new Date(`${fromIso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export interface Section8Check {
  /** Earliest date proceedings can start, given the longest notice period of the chosen grounds. */
  earliestDate: string;
  errors: string[];
  warnings: string[];
}

export function checkSection8(input: {
  grounds: string[];
  serveDate: string;
  tenancyStart: string;
  /** Overdue rent owed today. */
  arrears: number;
  monthlyRent: number;
  depositAmount?: number | null;
  depositProtected: boolean;
}): Section8Check {
  const errors: string[] = [];
  const warnings: string[] = [];
  const chosen = input.grounds.map(getGround).filter((g): g is Section8Ground => Boolean(g));
  if (!chosen.length) errors.push("Pick at least one ground.");

  let earliest = input.serveDate;
  for (const g of chosen) {
    const date = addPeriod(input.serveDate, g.period);
    if (date > earliest) earliest = date;
  }

  const firstYearEnd = addMonths(input.tenancyStart, 12);
  for (const g of chosen) {
    if (g.protectedFirstYear && earliest < firstYearEnd) {
      earliest = firstYearEnd;
      warnings.push(
        `Ground ${g.code} can't take effect in the first 12 months, so the earliest date moves to ${firstYearEnd}.`
      );
    }
    if (g.arrearsMonths) {
      const needed = input.monthlyRent * g.arrearsMonths;
      if (input.arrears + 0.005 < needed) {
        errors.push(
          `Ground ${g.code} needs at least ${g.arrearsMonths} months' rent owed (£${needed.toFixed(2)}). Overdue rent today is £${input.arrears.toFixed(2)}.`
        );
      }
    }
  }
  if (chosen.some((g) => g.code === "10") && input.arrears <= 0) {
    errors.push("Ground 10 needs some rent to be owed when the notice is served.");
  }
  if (input.depositAmount && input.depositAmount > 0 && !input.depositProtected) {
    warnings.push(
      "The deposit isn't recorded as protected. Courts can refuse possession on most grounds until that's fixed."
    );
  }
  if (chosen.length && chosen.every((g) => !g.mandatory)) {
    warnings.push("All chosen grounds are discretionary, so the court decides whether possession is reasonable.");
  }
  return { earliestDate: earliest, errors, warnings };
}
