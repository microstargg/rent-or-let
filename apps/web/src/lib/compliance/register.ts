/**
 * England's landlord register ("Register your rental property", the private
 * rented sector database under the Renters' Rights Act 2025).
 *
 * Source: gov.uk "Register your rental property service: guidance for landlords"
 * (updated 24 Nov 2026). Registration opens by region; each region has 3 months.
 * All let properties must be registered by 14 Nov 2027. £65 per property per
 * year; landlord registration is free; changes must be updated within 28 days.
 */

export type RegisterRegion =
  | "west_midlands"
  | "east_of_england"
  | "east_midlands"
  | "south_east"
  | "yorkshire_humber"
  | "north_west"
  | "north_east"
  | "london"
  | "south_west";

export const REGISTER_WINDOWS: Record<RegisterRegion, { label: string; opens: string; deadline: string }> = {
  west_midlands: { label: "West Midlands", opens: "2026-12-15", deadline: "2027-03-14" },
  east_of_england: { label: "East of England", opens: "2027-01-15", deadline: "2027-04-14" },
  east_midlands: { label: "East Midlands", opens: "2027-02-15", deadline: "2027-05-14" },
  south_east: { label: "South East", opens: "2027-03-15", deadline: "2027-06-14" },
  yorkshire_humber: { label: "Yorkshire and the Humber", opens: "2027-04-15", deadline: "2027-07-14" },
  north_west: { label: "North West", opens: "2027-05-15", deadline: "2027-08-14" },
  north_east: { label: "North East", opens: "2027-06-15", deadline: "2027-09-14" },
  london: { label: "London", opens: "2027-07-15", deadline: "2027-10-14" },
  south_west: { label: "South West", opens: "2027-08-15", deadline: "2027-11-14" },
};

export const REGISTER_FEE_PER_PROPERTY = 65;
/** Days before a window opens that we start prompting landlords. */
export const REGISTER_LEAD_DAYS = 60;

export function isRegisterRegion(v: unknown): v is RegisterRegion {
  return typeof v === "string" && v in REGISTER_WINDOWS;
}

/**
 * Postcode area to region. Areas that straddle a boundary (marked) use their
 * main region; staff can override per property.
 */
const AREA_REGION: Record<string, RegisterRegion> = {
  // North East
  NE: "north_east", SR: "north_east", DH: "north_east", TS: "north_east", DL: "north_east" /* part N Yorks */,
  // North West
  CA: "north_west", LA: "north_west", BB: "north_west", BL: "north_west", PR: "north_west", FY: "north_west",
  L: "north_west", WN: "north_west", WA: "north_west", M: "north_west", OL: "north_west", SK: "north_west",
  CH: "north_west" /* part Wales */, CW: "north_west",
  // Yorkshire and the Humber
  YO: "yorkshire_humber", HG: "yorkshire_humber", LS: "yorkshire_humber", BD: "yorkshire_humber",
  HX: "yorkshire_humber", HD: "yorkshire_humber", WF: "yorkshire_humber", S: "yorkshire_humber",
  DN: "yorkshire_humber" /* part Lincs */, HU: "yorkshire_humber",
  // East Midlands
  DE: "east_midlands", NG: "east_midlands", LE: "east_midlands", LN: "east_midlands", NN: "east_midlands",
  // West Midlands
  B: "west_midlands", CV: "west_midlands", WV: "west_midlands", WS: "west_midlands", DY: "west_midlands",
  ST: "west_midlands", TF: "west_midlands", WR: "west_midlands", HR: "west_midlands", SY: "west_midlands" /* part Wales */,
  // East of England
  CB: "east_of_england", CM: "east_of_england", CO: "east_of_england", IP: "east_of_england",
  NR: "east_of_england", SG: "east_of_england", AL: "east_of_england", LU: "east_of_england",
  PE: "east_of_england" /* part E Mids */, SS: "east_of_england", WD: "east_of_england",
  // London
  E: "london", EC: "london", N: "london", NW: "london", SE: "london", SW: "london", W: "london", WC: "london",
  BR: "london", CR: "london", HA: "london", IG: "london", RM: "london", SM: "london", TW: "london",
  UB: "london", EN: "london" /* part Herts */, KT: "london" /* part Surrey */, DA: "south_east" /* part London */,
  // South East
  BN: "south_east", CT: "south_east", GU: "south_east", ME: "south_east", MK: "south_east", OX: "south_east",
  PO: "south_east", RG: "south_east", RH: "south_east", SL: "south_east", SO: "south_east", TN: "south_east",
  HP: "south_east",
  // South West
  BA: "south_west", BH: "south_west", BS: "south_west", DT: "south_west", EX: "south_west", GL: "south_west",
  PL: "south_west", SN: "south_west", SP: "south_west", TA: "south_west", TQ: "south_west", TR: "south_west",
};

export function regionForPostcode(postcode: string | null | undefined): RegisterRegion | null {
  const area = postcode?.trim().toUpperCase().match(/^[A-Z]{1,2}/)?.[0];
  if (!area) return null;
  return AREA_REGION[area] ?? null;
}

export interface RegisterInfo {
  region: RegisterRegion | null;
  /** True when the region came from the postcode rather than being set by staff. */
  regionGuessed: boolean;
  opens: string | null;
  deadline: string | null;
  propertyNumber: string | null;
  registeredAt: string | null;
}

export function registerInfo(input: {
  postcode: string | null;
  prsRegion: string | null;
  prsPropertyNumber: string | null;
  prsRegisteredAt: string | null;
}): RegisterInfo {
  const set = isRegisterRegion(input.prsRegion) ? input.prsRegion : null;
  const region = set ?? regionForPostcode(input.postcode);
  const w = region ? REGISTER_WINDOWS[region] : null;
  return {
    region,
    regionGuessed: !set && Boolean(region),
    opens: w?.opens ?? null,
    deadline: w?.deadline ?? null,
    propertyNumber: input.prsPropertyNumber?.trim() || null,
    registeredAt: input.prsRegisteredAt,
  };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type RegisterStatus =
  | { status: "not_due"; dueDate: string | null }
  | { status: "valid" | "expiring" | "expired" | "missing"; dueDate: string | null };

/**
 * Where a let property stands on the register.
 * - registered: valid, or expiring/expired against the landlord's renewal date
 * - not registered: not_due until 60 days before the window opens, then
 *   expiring until the deadline, then expired. No known region: missing.
 */
export function registerStatus(
  info: RegisterInfo,
  landlordRenewalDate: string | null,
  today: Date = new Date()
): RegisterStatus {
  const now = today.toISOString().slice(0, 10);
  if (info.propertyNumber) {
    if (!landlordRenewalDate) return { status: "valid", dueDate: null };
    if (landlordRenewalDate < now) return { status: "expired", dueDate: landlordRenewalDate };
    if (landlordRenewalDate <= addDays(now, 30)) return { status: "expiring", dueDate: landlordRenewalDate };
    return { status: "valid", dueDate: landlordRenewalDate };
  }
  if (!info.opens || !info.deadline) return { status: "missing", dueDate: null };
  if (now < addDays(info.opens, -REGISTER_LEAD_DAYS)) return { status: "not_due", dueDate: info.deadline };
  if (now <= info.deadline) return { status: "expiring", dueDate: info.deadline };
  return { status: "expired", dueDate: info.deadline };
}

const PROPERTY_NUMBER = /^P-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const LANDLORD_NUMBER = /^L-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function normaliseRegisterNumber(value: string | null | undefined, kind: "property" | "landlord") {
  const v = value?.trim().toUpperCase() || null;
  if (!v) return { value: null, ok: true };
  return { value: v, ok: (kind === "property" ? PROPERTY_NUMBER : LANDLORD_NUMBER).test(v) };
}

/** Record types whose renewal must be updated on the register within 28 days. */
export const REGISTER_TRACKED_TYPES = new Set([
  "gas_safety",
  "eicr",
  "epc",
  "hmo_licence",
  "selective_licence",
  "additional_licence",
]);
