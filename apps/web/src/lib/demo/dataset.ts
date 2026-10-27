/**
 * Fake agency data for the public demo (demo.letflow.app).
 *
 * Pure and deterministic: the same `today` always builds the same rows, dated relative
 * to it so the demo always looks current. Rows mirror what the app's own write paths
 * produce (tenancy ledger, allocations, landlord client-money ledger, statements), so
 * every finance screen agrees with every other one.
 */
import { defaultInspectionReport } from "@/lib/inspections/report";
import {
  groupLandlordStatementTotals,
  propertiesForIndividualStatements,
  propertyStatementTotals,
} from "@/lib/operations/finance/statement-totals";
import {
  WORKS_INVOICE_BILLED,
  WORKS_INVOICE_PENDING,
  WORKS_INVOICE_TYPE,
} from "@/lib/operations/maintenance/constants";
import {
  statementDownloadFilename,
  statementDownloadPath,
  type LandlordStatementWorkLine,
} from "@/lib/pdf/landlord-statement";
import {
  DEMO_AGENCY_SLUG,
  DEMO_BRANCH_ID,
  DEMO_LANDLORD_ID,
  DEMO_RENTER_ID,
  DEMO_ACCOUNTS,
} from "./constants";

export type DemoRow = Record<string, unknown>;

/** Insert order respects foreign keys. */
export const DEMO_TABLE_ORDER = [
  "agencies",
  "branches",
  "landlords",
  "properties",
  "renters",
  "tenancies",
  "contractors",
  "documents",
  "compliance_items",
  "inspections",
  "notices",
  "pet_requests",
  "tickets",
  "ticket_messages",
  "work_orders",
  "invoices",
  "payments",
  "payment_allocations",
  "ledger_entries",
  "payment_exceptions",
  "landlord_statements",
  "landlord_ledger_entries",
  "landlord_payouts",
  "bank_connections",
  "bank_transactions",
  "enquiries",
  "viewings",
  "tenant_applications",
  "complaints",
  "tasks",
] as const;

export type DemoTable = (typeof DEMO_TABLE_ORDER)[number];
export type DemoDataset = Record<DemoTable, DemoRow[]>;

const A = DEMO_AGENCY_SLUG;
const B = DEMO_BRANCH_ID;
const MANAGEMENT_FEE_PERCENT = 10;

// ---------------------------------------------------------------------------
// Deterministic helpers

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable UUIDs: one hex prefix per table, then a counter. */
const TABLE_PREFIX: Record<string, number> = {
  branches: 0x0,
  landlords: 0x2,
  properties: 0x3,
  renters: 0x4,
  tenancies: 0x5,
  contractors: 0x6,
  documents: 0x7,
  compliance_items: 0x8,
  inspections: 0x9,
  notices: 0xa,
  pet_requests: 0xb,
  tickets: 0xc,
  ticket_messages: 0xd,
  work_orders: 0xe,
  invoices: 0xf,
  payments: 0x10,
  payment_allocations: 0x11,
  ledger_entries: 0x12,
  payment_exceptions: 0x13,
  landlord_statements: 0x14,
  landlord_ledger_entries: 0x15,
  landlord_payouts: 0x16,
  bank_connections: 0x17,
  bank_transactions: 0x18,
  enquiries: 0x19,
  viewings: 0x1a,
  tenant_applications: 0x1b,
  complaints: 0x1c,
  tasks: 0x1d,
};

export function demoUuid(table: string, n: number): string {
  const prefix = (0xde300000 + (TABLE_PREFIX[table] ?? 0xff)).toString(16).padStart(8, "0");
  return `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDate(y: number, m: number, d: number, hour = 12, minute = 0): Date {
  return new Date(Date.UTC(y, m, d, hour, minute));
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function firstOfMonth(d: Date, offsetMonths = 0): Date {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth() + offsetMonths, 1, 0);
}

function lastOfMonth(d: Date): Date {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 0);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ofcom drama range, never a real number. */
function phone(n: number): string {
  return `07700 900${String(n % 1000).padStart(3, "0")}`;
}

// ---------------------------------------------------------------------------
// Source material (all fictional)

const LANDLORDS: Array<[string, string, string]> = [
  ["Margaret", "Ellison", "Portfolio of three homes in Darlington. Prefers email updates."],
  ["David", "Okafor", "Owns two flats in Stockton. Approve works over £250 by phone."],
  ["Priya", "Raman", ""],
  ["Gareth", "Lowther", "Overseas landlord (Spain). NRL scheme applies."],
  ["Susan", "Whitfield", ""],
  ["Tom", "Hargreaves", "Retired; wants quarterly calls."],
  ["Aisha", "Begum", ""],
  ["Neil", "Cartwright", "Also uses us for his commercial unit in Yarm."],
  ["Helen", "Ashworth", ""],
  ["Robert", "Kaye", ""],
  ["Fiona", "McAllister", "Joint owner with her brother; statements to both."],
  ["Imran", "Siddiqui", ""],
  ["Claire", "Donnelly", ""],
  ["Peter", "Fenwick", "Prefers like-for-like replacements only."],
  ["Lucy", "Barraclough", ""],
];

const RENTER_FIRST = [
  "Chloe", "Jordan", "Amelia", "Liam", "Grace", "Ethan", "Hannah", "Kieran", "Zara", "Callum",
  "Megan", "Owen", "Leah", "Ryan", "Jessica", "Daniel", "Niamh", "Josh", "Ellie", "Marcus",
  "Abigail", "Connor", "Freya", "Adam", "Isla", "Nathan", "Ruby", "Lewis", "Holly", "Samuel",
];
const RENTER_LAST = [
  "Bramwell", "Pickering", "Hussain", "Robson", "Atkinson", "Nwosu", "Dobson", "Kowalski",
  "Ahmed", "Thornton", "Wilkinson", "Patel", "Brennan", "Lister", "Moran", "Chapman", "Doyle",
  "Fairclough", "Iqbal", "Stephenson", "Rowley", "Bell", "Garside", "Lawson", "Mensah",
  "Nicholson", "Oduya", "Pearson", "Quigley", "Richardson",
];

type PropertySeed = {
  number: string;
  street: string;
  town: string;
  postcode: string;
  bedrooms: number;
  bathrooms: number;
  type: string;
  furnished: string;
  rent: number;
  epc: string;
};

const PROPERTIES: PropertySeed[] = [
  { number: "14", street: "Larchfield Road", town: "Darlington", postcode: "DL3 7QJ", bedrooms: 3, bathrooms: 1, type: "semi_detached", furnished: "unfurnished", rent: 850, epc: "C" },
  { number: "7", street: "Mowden Crescent", town: "Darlington", postcode: "DL3 9RW", bedrooms: 2, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 675, epc: "D" },
  { number: "Flat 3, 22", street: "Coniscliffe Mews", town: "Darlington", postcode: "DL1 5LT", bedrooms: 1, bathrooms: 1, type: "flat", furnished: "furnished", rent: 595, epc: "C" },
  { number: "41", street: "Hartburn Avenue", town: "Stockton-on-Tees", postcode: "TS18 5BX", bedrooms: 3, bathrooms: 2, type: "semi_detached", furnished: "unfurnished", rent: 925, epc: "B" },
  { number: "Flat 12", street: "Riverside Quay", town: "Stockton-on-Tees", postcode: "TS17 6QA", bedrooms: 2, bathrooms: 2, type: "flat", furnished: "part_furnished", rent: 795, epc: "B" },
  { number: "88", street: "Acklam Grange", town: "Middlesbrough", postcode: "TS5 7HD", bedrooms: 4, bathrooms: 2, type: "detached", furnished: "unfurnished", rent: 1250, epc: "C" },
  { number: "3", street: "Marton Burn Close", town: "Middlesbrough", postcode: "TS7 8EN", bedrooms: 3, bathrooms: 1, type: "semi_detached", furnished: "unfurnished", rent: 800, epc: "D" },
  { number: "19", street: "Linthorpe Terrace", town: "Middlesbrough", postcode: "TS1 3RP", bedrooms: 2, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 575, epc: "E" },
  { number: "5", street: "Elvet Bridge Court", town: "Durham", postcode: "DH1 3AQ", bedrooms: 2, bathrooms: 1, type: "flat", furnished: "furnished", rent: 950, epc: "C" },
  { number: "27", street: "Gilesgate Rise", town: "Durham", postcode: "DH1 1QT", bedrooms: 3, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 875, epc: "D" },
  { number: "The Granary, 2", street: "Leven Bank", town: "Yarm", postcode: "TS15 9JD", bedrooms: 3, bathrooms: 2, type: "barn_conversion", furnished: "unfurnished", rent: 1395, epc: "C" },
  { number: "11", street: "High Church Wynd", town: "Yarm", postcode: "TS15 9BQ", bedrooms: 2, bathrooms: 1, type: "cottage", furnished: "part_furnished", rent: 925, epc: "D" },
  { number: "62", street: "Seaton Lane", town: "Hartlepool", postcode: "TS25 1HR", bedrooms: 3, bathrooms: 1, type: "semi_detached", furnished: "unfurnished", rent: 650, epc: "C" },
  { number: "9", street: "Marina Point", town: "Hartlepool", postcode: "TS24 0XZ", bedrooms: 2, bathrooms: 2, type: "flat", furnished: "furnished", rent: 725, epc: "B" },
  { number: "34", street: "Eaglescliffe Drive", town: "Stockton-on-Tees", postcode: "TS16 0LN", bedrooms: 4, bathrooms: 2, type: "detached", furnished: "unfurnished", rent: 1150, epc: "C" },
  { number: "16", street: "Cockerton Green", town: "Darlington", postcode: "DL3 9EU", bedrooms: 2, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 625, epc: "D" },
  { number: "Flat 6", street: "Victoria Works", town: "Darlington", postcode: "DL1 1GH", bedrooms: 1, bathrooms: 1, type: "flat", furnished: "furnished", rent: 550, epc: "C" },
  { number: "73", street: "Norton Road", town: "Stockton-on-Tees", postcode: "TS20 2BL", bedrooms: 3, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 695, epc: "D" },
  { number: "2", street: "Nunthorpe Gardens", town: "Middlesbrough", postcode: "TS7 0PF", bedrooms: 4, bathrooms: 3, type: "detached", furnished: "unfurnished", rent: 1495, epc: "B" },
  { number: "45", street: "Crossgate Peth", town: "Durham", postcode: "DH1 4PZ", bedrooms: 5, bathrooms: 2, type: "terraced", furnished: "furnished", rent: 1650, epc: "D" },
  { number: "8", street: "Ingleby Way", town: "Stockton-on-Tees", postcode: "TS17 0QU", bedrooms: 3, bathrooms: 2, type: "semi_detached", furnished: "unfurnished", rent: 875, epc: "B" },
  { number: "21", street: "Albert Hill Row", town: "Darlington", postcode: "DL1 2PS", bedrooms: 2, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 595, epc: "E" },
  { number: "Flat 4", street: "Dock Street Lofts", town: "Hartlepool", postcode: "TS24 7JL", bedrooms: 1, bathrooms: 1, type: "flat", furnished: "furnished", rent: 495, epc: "C" },
  { number: "17", street: "Wolviston Lane", town: "Billingham", postcode: "TS22 5LD", bedrooms: 3, bathrooms: 1, type: "semi_detached", furnished: "unfurnished", rent: 725, epc: "C" },
  { number: "6", street: "Saltwell Court", town: "Middlesbrough", postcode: "TS4 2QW", bedrooms: 2, bathrooms: 1, type: "bungalow", furnished: "unfurnished", rent: 700, epc: "D" },
  { number: "52", street: "Haughton Grange", town: "Darlington", postcode: "DL1 2HE", bedrooms: 3, bathrooms: 2, type: "semi_detached", furnished: "unfurnished", rent: 895, epc: "C" },
  // Vacant: marketed listings with enquiries and viewings.
  { number: "30", street: "Brinkburn Road", town: "Darlington", postcode: "DL3 6DS", bedrooms: 3, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 775, epc: "C" },
  { number: "Flat 9", street: "Teesdale Wharf", town: "Stockton-on-Tees", postcode: "TS17 6BH", bedrooms: 2, bathrooms: 2, type: "flat", furnished: "furnished", rent: 850, epc: "B" },
  { number: "4", street: "Grange Field Lane", town: "Middlesbrough", postcode: "TS5 6PL", bedrooms: 4, bathrooms: 2, type: "detached", furnished: "unfurnished", rent: 1295, epc: "C" },
  { number: "15", street: "Sherburn Road", town: "Durham", postcode: "DH1 2JR", bedrooms: 2, bathrooms: 1, type: "terraced", furnished: "unfurnished", rent: 725, epc: "D" },
];

/** Landlord index for each property (Margaret Ellison, the demo landlord, owns 0-2). */
const PROPERTY_LANDLORD = [0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 9, 10, 11, 12, 13, 14, 3, 6, 8, 10, 5, 11, 12, 13];
const LET_COUNT = 26;

/** Tenancies whose rent account tells a story. Index = property index. */
type PayProfile = "good" | "late" | "arrears" | "partial" | "new";
const PAY_PROFILE: Record<number, PayProfile> = {
  7: "arrears",
  12: "partial",
  16: "late",
  21: "arrears",
  24: "new",
  25: "new",
};

const PROPERTY_FEATURES = [
  ["Gas central heating", "Double glazing", "Enclosed rear garden", "Off-street parking"],
  ["Gas central heating", "Modern kitchen", "Close to schools", "Rear yard"],
  ["Allocated parking", "Lift access", "Open-plan living", "Walk to station"],
  ["Recently refurbished", "En-suite to main bedroom", "Driveway", "South-facing garden"],
];

const CONTRACTORS: Array<[string, string, string]> = [
  ["Tees Valley Plumbing & Heating", "plumbing", "Gas Safe registered. Out-of-hours line."],
  ["Brightspark Electrical", "electrical", "NICEIC approved. Does all EICRs."],
  ["Quayside Property Maintenance", "general", "Handyman, joinery and small repairs."],
  ["Northern Lock & Glass", "locks_security", "24/7 emergency locksmith."],
  ["GreenEdge Gardens", "garden", "Seasonal garden tidy-ups for vacant homes."],
  ["DryHome Damp Specialists", "damp_mould", "Surveys and treatment, 10-year guarantees."],
  ["Clearview Pest Control", "pest", ""],
  ["Apex Roofing NE", "structural", "Roofs, gutters and chimneys."],
];

type TicketSeed = {
  property: number;
  summary: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  daysAgo: number;
  emergency?: boolean;
  location?: string;
  work?: { contractor: number; status: string; estimate: number; final?: number; scheduledInDays: number };
  messages?: Array<[string, string]>;
};

const TICKETS: TicketSeed[] = [
  { property: 0, summary: "Boiler losing pressure", description: "Pressure drops to 0.5 bar every couple of days and the heating cuts out.", category: "heating", priority: "high", status: "scheduled", daysAgo: 3, location: "Kitchen", work: { contractor: 0, status: "assigned", estimate: 165, scheduledInDays: 2 }, messages: [["renter", "The boiler keeps dropping pressure, I've topped it up twice this week."], ["staff", "Thanks for letting us know. Tees Valley Plumbing will call to book a visit."], ["renter", "Great, any morning works for me."]] },
  { property: 0, summary: "Annual gas safety check", description: "Gas safety record due next month.", category: "gas", priority: "medium", status: "completed", daysAgo: 48, work: { contractor: 0, status: "completed", estimate: 75, final: 75, scheduledInDays: -40 } },
  { property: 1, summary: "Back door lock sticking", description: "Key is hard to turn in the back door, worried it will snap.", category: "locks_security", priority: "medium", status: "completed", daysAgo: 70, location: "Kitchen", work: { contractor: 3, status: "completed", estimate: 95, final: 110, scheduledInDays: -66 } },
  { property: 2, summary: "Extractor fan not working", description: "Bathroom extractor stopped working, mirror steaming up badly.", category: "electrical", priority: "low", status: "triaged", daysAgo: 6, location: "Bathroom" },
  { property: 3, summary: "Dishwasher leaking", description: "Water pooling under the dishwasher after each cycle.", category: "appliance", priority: "medium", status: "completed", daysAgo: 34, location: "Kitchen", work: { contractor: 2, status: "completed", estimate: 140, final: 128.5, scheduledInDays: -30 } },
  { property: 4, summary: "Mould in bedroom corner", description: "Black mould appearing behind the wardrobe in the main bedroom.", category: "damp_mould", priority: "high", status: "scheduled", daysAgo: 9, location: "Bedroom 1", work: { contractor: 5, status: "awaiting_approval", estimate: 480, scheduledInDays: 6 }, messages: [["renter", "I've wiped it down but it keeps coming back."], ["staff", "We've asked a damp specialist to survey. Their quote needs landlord approval first."]] },
  { property: 5, summary: "Garden fence panel down", description: "Two fence panels blew down in the storm.", category: "garden", priority: "medium", status: "completed", daysAgo: 95, location: "Exterior", work: { contractor: 2, status: "completed", estimate: 210, final: 225, scheduledInDays: -88 } },
  { property: 7, summary: "No hot water", description: "Hot water stopped this morning, heating still works.", category: "heating", priority: "urgent", status: "completed", daysAgo: 22, emergency: true, work: { contractor: 0, status: "completed", estimate: 120, final: 186, scheduledInDays: -21 } },
  { property: 8, summary: "Window handle broken", description: "Living room window handle has come off.", category: "other", priority: "low", status: "new", daysAgo: 1, location: "Living room" },
  { property: 9, summary: "EICR remedial works", description: "Consumer unit labelling and two sockets flagged C2 on the EICR.", category: "electrical", priority: "high", status: "completed", daysAgo: 56, work: { contractor: 1, status: "completed", estimate: 260, final: 240, scheduledInDays: -50 } },
  { property: 10, summary: "Roof tile slipped", description: "A tile has slipped above the front bedroom, no leak yet.", category: "structural", priority: "medium", status: "scheduled", daysAgo: 12, work: { contractor: 7, status: "approved", estimate: 185, scheduledInDays: 4 } },
  { property: 11, summary: "Mice in kitchen", description: "Droppings found under the sink.", category: "pest", priority: "high", status: "completed", daysAgo: 40, location: "Kitchen", work: { contractor: 6, status: "completed", estimate: 145, final: 145, scheduledInDays: -37 } },
  { property: 13, summary: "Shower tray cracked", description: "Hairline crack in the shower tray, small leak to the ceiling below.", category: "plumbing", priority: "high", status: "scheduled", daysAgo: 5, location: "Bathroom", work: { contractor: 0, status: "draft", estimate: 390, scheduledInDays: 8 } },
  { property: 14, summary: "Oven not heating", description: "Top oven heats but main oven stays cold.", category: "appliance", priority: "medium", status: "completed", daysAgo: 15, location: "Kitchen", work: { contractor: 1, status: "completed", estimate: 110, final: 98, scheduledInDays: -12 } },
  { property: 15, summary: "Gutter overflowing", description: "Front gutter overflows when it rains heavily.", category: "structural", priority: "low", status: "new", daysAgo: 2 },
  { property: 18, summary: "Smoke alarm chirping", description: "Hallway smoke alarm chirps every minute.", category: "electrical", priority: "medium", status: "completed", daysAgo: 64, work: { contractor: 1, status: "completed", estimate: 45, final: 45, scheduledInDays: -63 } },
  { property: 19, summary: "Radiator cold at top", description: "Two bedroom radiators cold at the top.", category: "heating", priority: "low", status: "completed", daysAgo: 120, work: { contractor: 0, status: "completed", estimate: 80, final: 80, scheduledInDays: -115 } },
  { property: 21, summary: "Front door draughty", description: "Gap at the bottom of the front door letting cold air in.", category: "other", priority: "low", status: "cancelled", daysAgo: 30 },
  { property: 23, summary: "Kitchen tap dripping", description: "Mixer tap drips constantly.", category: "plumbing", priority: "low", status: "completed", daysAgo: 8, location: "Kitchen", work: { contractor: 0, status: "completed", estimate: 96.5, final: 96.5, scheduledInDays: -4 } },
  { property: 26, summary: "Garden tidy before marketing", description: "Overgrown front and rear garden on the vacant property.", category: "garden", priority: "low", status: "scheduled", daysAgo: 7, work: { contractor: 4, status: "assigned", estimate: 160, scheduledInDays: 3 } },
];

// ---------------------------------------------------------------------------

export function buildDemoDataset(today: Date = new Date()): DemoDataset {
  const now = new Date(today);
  const rnd = mulberry32(20261027);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;

  const data = Object.fromEntries(DEMO_TABLE_ORDER.map((t) => [t, [] as DemoRow[]])) as DemoDataset;
  const counters: Record<string, number> = {};
  const nextId = (table: string) => demoUuid(table, (counters[table] = (counters[table] ?? 0) + 1));

  data.agencies.push({
    slug: A,
    name: "LetFlow Demo Lettings",
    platform_host: "demo.letflow.app",
    public_site_url: null,
    website_enabled: false,
  });

  data.branches.push({
    id: B,
    agency_id: A,
    name: "LetFlow Demo Lettings",
    address: "Unit 4, Teesside Business Quarter, Stockton-on-Tees, TS17 6QW",
    phone: "01642 000 000",
    rightmove_sync_enabled: false,
    otm_sync_enabled: false,
    settings: {
      management_fee_percent: MANAGEMENT_FEE_PERCENT,
      late_fee_rules: { enabled: true, grace_days: 7, fixed_amount: 25, percent: null },
      work_order_approval_threshold: 250,
      default_maintenance_sla_hours: 72,
      client_account_name: "LetFlow Demo Lettings Client Account",
      client_account_sort_code: "00-00-00",
      client_account_number: "00000000",
      maintenance_inbox_token: "demo-maintenance-inbox",
    },
    created_at: addMonths(now, -40),
  });

  // Landlords -----------------------------------------------------------------
  const landlordIds: string[] = [];
  LANDLORDS.forEach(([first, last, notes], i) => {
    const id = i === 0 ? DEMO_LANDLORD_ID : nextId("landlords");
    if (i === 0) counters.landlords = (counters.landlords ?? 0) + 1;
    landlordIds.push(id);
    data.landlords.push({
      id,
      agency_id: A,
      branch_id: B,
      first_name: first,
      last_name: last,
      email: i === 0 ? DEMO_ACCOUNTS.landlord.email : `${first}.${last}@example.com`.toLowerCase(),
      phone: phone(100 + i),
      bank_details: { account_name: `${first} ${last}`, sort_code: "00-00-00", account_number: `0000${String(1000 + i)}` },
      notes: notes || null,
      created_at: addMonths(now, -(36 - i)),
    });
  });

  // Properties ----------------------------------------------------------------
  const propertyIds: string[] = [];
  const addressOf = new Map<string, string>();
  PROPERTIES.forEach((p, i) => {
    const id = nextId("properties");
    propertyIds.push(id);
    const displayAddress = `${p.number} ${p.street}, ${p.town}, ${p.postcode}`;
    addressOf.set(id, displayAddress);
    const vacant = i >= LET_COUNT;
    const features = PROPERTY_FEATURES[i % PROPERTY_FEATURES.length]!;
    const typeLabel = p.type.replace(/_/g, " ");
    data.properties.push({
      id,
      agency_id: A,
      branch_id: B,
      landlord_id: landlordIds[PROPERTY_LANDLORD[i]!],
      is_vacant: vacant,
      agent_ref: `DEM${String(101 + i)}`,
      slug: slugify(`${p.bedrooms}-bed-${typeLabel}-${p.street}-${p.town}`),
      display_address: displayAddress,
      house_name_number: p.number,
      street: p.street,
      town: p.town,
      postcode: p.postcode,
      price_pcm: p.rent,
      deposit: money(Math.floor(((p.rent * 12) / 52) * 5)),
      holding_deposit: money(Math.floor((p.rent * 12) / 52)),
      available_from: vacant ? isoDate(addDays(now, 7 + i)) : isoDate(addMonths(now, -12)),
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      property_type: p.type,
      furnished: p.furnished,
      status: vacant ? (i === LET_COUNT + 3 ? "draft" : "available") : "let_agreed",
      summary: `${p.bedrooms} bedroom ${typeLabel} in ${p.town}`,
      description:
        `A well-presented ${p.bedrooms} bedroom ${typeLabel} on ${p.street}, ${p.town}. ` +
        `The home offers ${p.bathrooms > 1 ? `${p.bathrooms} bathrooms` : "a modern bathroom"}, ` +
        `${features.slice(0, 2).join(" and ").toLowerCase()}, and is ${p.furnished.replace("_", " ")}. ` +
        "Close to local shops, schools and transport links. Pets considered on request.",
      features,
      permitted_payments: [],
      epc_rating: p.epc,
      boiler_model: p.type === "flat" ? "Ideal Logic Combi 30" : "Worcester Bosch Greenstar 4000",
      boiler_install_date: isoDate(addMonths(now, -(18 + i * 3))),
      metadata: {},
      portal_sync: {},
      published_at: vacant && i !== LET_COUNT + 3 ? addDays(now, -(5 + i - LET_COUNT)) : null,
      created_at: addMonths(now, -(30 - Math.floor(i / 2))),
      updated_at: addDays(now, -(i % 20)),
    });
  });

  // Renters + tenancies ----------------------------------------------------------
  type TenancyInfo = {
    id: string;
    propertyIndex: number;
    propertyId: string;
    landlordId: string;
    renterId: string;
    rent: number;
    start: Date;
    profile: PayProfile;
  };
  const tenancyList: TenancyInfo[] = [];
  for (let i = 0; i < LET_COUNT; i++) {
    const p = PROPERTIES[i]!;
    const renterId = i === 0 ? DEMO_RENTER_ID : nextId("renters");
    if (i === 0) counters.renters = (counters.renters ?? 0) + 1;
    const first = RENTER_FIRST[i]!;
    const last = RENTER_LAST[i]!;
    const profile = PAY_PROFILE[i] ?? (i % 7 === 3 ? "late" : "good");
    // Start dates spread from ~3 years ago to last month; "new" tenancies started recently.
    const monthsAgo = profile === "new" ? (i === 24 ? 1 : 2) : 4 + ((i * 7) % 32);
    const start = firstOfMonth(now, -monthsAgo);
    const tenancyId = nextId("tenancies");
    const landlordId = landlordIds[PROPERTY_LANDLORD[i]!]!;

    data.renters.push({
      id: renterId,
      agency_id: A,
      branch_id: B,
      landlord_id: landlordId,
      first_name: first,
      last_name: last,
      email: i === 0 ? DEMO_ACCOUNTS.renter.email : `${first}.${last}@example.com`.toLowerCase(),
      phone: phone(200 + i),
      employment_info: {
        status: pick(["employed", "employed", "employed", "self_employed", "student"]),
        employer: pick(["NHS Foundation Trust", "Teesside University", "Stockton Borough Council", "Nissan UK", "Amazon Logistics", "Self-employed"]),
        annual_income: Math.round((p.rent * 12 * (2.6 + rnd())) / 100) * 100,
      },
      notes: null,
      created_at: addDays(start, -21),
    });

    const deposit = money(Math.floor(((p.rent * 12) / 52) * 5));
    const scheme = pick(["DPS", "TDS", "mydeposits"]);
    data.tenancies.push({
      id: tenancyId,
      agency_id: A,
      branch_id: B,
      property_id: propertyIds[i],
      primary_renter_id: renterId,
      rent_amount: p.rent,
      rent_frequency: "monthly",
      deposit_amount: deposit,
      start_date: isoDate(start),
      end_date: null,
      status: "active",
      deposit_scheme: scheme,
      deposit_protected_at: isoDate(addDays(start, 9)),
      deposit_protection_ref: `${scheme.toUpperCase().slice(0, 3)}-${String(400000 + i * 7919).slice(0, 6)}`,
      rent_review_date: isoDate(addMonths(start, 12 * Math.max(1, Math.ceil(monthsAgo / 12)))),
      metadata: { payment_ref: `DEM-${(0x1a2b3c + i * 7919).toString(36).toUpperCase().slice(-6)}` },
      created_at: addDays(start, -14),
    });

    tenancyList.push({
      id: tenancyId,
      propertyIndex: i,
      propertyId: propertyIds[i]!,
      landlordId,
      renterId,
      rent: p.rent,
      start,
      profile,
    });
  }

  // Ended tenancy history on two homes (former tenants).
  for (const [k, pi] of [[0, 3], [1, 9]] as const) {
    const renterId = nextId("renters");
    const first = RENTER_FIRST[26 + k]!;
    const last = RENTER_LAST[26 + k]!;
    data.renters.push({
      id: renterId,
      agency_id: A,
      branch_id: B,
      landlord_id: landlordIds[PROPERTY_LANDLORD[pi]!],
      first_name: first,
      last_name: last,
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: phone(260 + k),
      employment_info: null,
      notes: "Former tenant. Deposit returned in full.",
      created_at: addMonths(now, -60),
    });
    const current = tenancyList[pi]!;
    data.tenancies.push({
      id: nextId("tenancies"),
      agency_id: A,
      branch_id: B,
      property_id: propertyIds[pi],
      primary_renter_id: renterId,
      rent_amount: money(PROPERTIES[pi]!.rent * 0.92),
      rent_frequency: "monthly",
      deposit_amount: money(PROPERTIES[pi]!.rent),
      start_date: isoDate(addMonths(current.start, -30)),
      end_date: isoDate(addDays(current.start, -10)),
      status: "ended",
      deposit_scheme: "DPS",
      deposit_protected_at: isoDate(addMonths(current.start, -30)),
      deposit_protection_ref: `DPS-${String(300000 + k)}`,
      rent_review_date: null,
      metadata: {},
      created_at: addMonths(current.start, -31),
    });
  }

  // Contractors -------------------------------------------------------------------
  const contractorIds = CONTRACTORS.map(([name, trade, notes], i) => {
    const id = nextId("contractors");
    data.contractors.push({
      id,
      agency_id: A,
      branch_id: B,
      name,
      email: `jobs@${slugify(name).replace(/-/g, "")}.example.com`,
      phone: phone(400 + i),
      trade,
      notes: notes || null,
      created_at: addMonths(now, -(30 - i)),
    });
    return id;
  });

  // Compliance ------------------------------------------------------------------------
  propertyIds.forEach((propertyId, i) => {
    const p = PROPERTIES[i]!;
    const tenancy = tenancyList[i];
    const gasIssued = addDays(now, -(20 + ((i * 37) % 340)));
    const gasExpires = i === 19 ? addDays(now, -6) : addMonths(gasIssued, 12);
    const eicrIssued = addMonths(now, -(6 + ((i * 5) % 50)));
    const items: Array<{ type: string; issued: Date | null; expires: Date | null; reference?: string; tenancy?: boolean; status?: string }> = [
      { type: "gas_safety", issued: gasIssued, expires: gasExpires, reference: `GSR-${2400 + i}`, tenancy: true },
      { type: "epc", issued: addMonths(now, -(24 + i)), expires: addMonths(now, 96 - i), reference: `EPC ${p.epc}`, tenancy: true },
      { type: "eicr", issued: eicrIssued, expires: addMonths(eicrIssued, 60), reference: `EICR-${8800 + i}` },
    ];
    if (tenancy) {
      items.push(
        { type: "deposit_pi", issued: addDays(tenancy.start, 9), expires: null, tenancy: true, status: "valid" },
        { type: "right_to_rent", issued: addDays(tenancy.start, -10), expires: null, tenancy: true, status: "valid" },
        // Two recent tenancies still waiting on the RRA information sheet.
        i === 24 || i === 25
          ? { type: "rra_info_sheet", issued: null, expires: null, tenancy: true, status: "missing" }
          : { type: "rra_info_sheet", issued: addMonths(now, -1), expires: null, tenancy: true, status: "valid" }
      );
    }
    for (const item of items) {
      let status = item.status;
      if (!status) {
        const days = item.expires ? Math.floor((item.expires.getTime() - now.getTime()) / 86400000) : null;
        status = days == null ? "valid" : days < 0 ? "expired" : days <= 30 ? "expiring" : "valid";
      }
      data.compliance_items.push({
        id: nextId("compliance_items"),
        agency_id: A,
        branch_id: B,
        property_id: propertyId,
        tenancy_id: item.tenancy && tenancy ? tenancy.id : null,
        type: item.type,
        status,
        issued_at: item.issued ? isoDate(item.issued) : null,
        expires_at: item.expires ? isoDate(item.expires) : null,
        reference: item.reference ?? null,
        document_id: null,
        meta: {},
        created_at: item.issued ?? now,
        updated_at: item.issued ?? now,
      });
    }
  });

  // Inspections ---------------------------------------------------------------------
  for (const t of tenancyList) {
    const p = PROPERTIES[t.propertyIndex]!;
    const report = defaultInspectionReport(p.bedrooms);
    data.inspections.push({
      id: nextId("inspections"),
      agency_id: A,
      branch_id: B,
      property_id: t.propertyId,
      tenancy_id: t.id,
      type: "move_in",
      scheduled_at: addDays(t.start, -1),
      completed_at: addDays(t.start, -1),
      notes: "Check-in completed with tenant present. Keys x3 handed over.",
      summary: "Property clean and in good order throughout.",
      meta: { report },
      created_at: addDays(t.start, -7),
    });
    for (const months of [6, 12, 18, 24, 30, 36]) {
      const at = addMonths(t.start, months);
      if (at.getTime() > addMonths(now, 3).getTime()) break;
      const done = at.getTime() < now.getTime() - 7 * 86400000;
      data.inspections.push({
        id: nextId("inspections"),
        agency_id: A,
        branch_id: B,
        property_id: t.propertyId,
        tenancy_id: t.id,
        type: "interim",
        scheduled_at: at,
        completed_at: done ? addDays(at, 1) : null,
        notes: done ? pick(["Tenant home. No issues raised.", "Minor wear to hallway carpet noted.", "Garden well kept. Advised tenant on ventilation."]) : null,
        summary: done ? pick(["Good condition.", "Good condition overall, minor wear.", "Fair. Some condensation in bathroom."]) : null,
        meta: { report },
        created_at: addDays(t.start, -1),
      });
    }
  }

  // Notices + pet requests ------------------------------------------------------------
  {
    const t = tenancyList[10]!;
    data.notices.push({
      id: nextId("notices"),
      agency_id: A,
      branch_id: B,
      tenancy_id: t.id,
      type: "section_13",
      served_at: addDays(now, -20),
      effective_at: isoDate(addDays(now, 45)),
      grounds: null,
      document_id: null,
      meta: { current_rent: t.rent, proposed_rent: t.rent + 50, method: "email" },
      created_at: addDays(now, -20),
    });
  }
  {
    const t = tenancyList[5]!;
    data.pet_requests.push({
      id: nextId("pet_requests"),
      agency_id: A,
      branch_id: B,
      tenancy_id: t.id,
      renter_id: t.renterId,
      pet_description: "Cockapoo puppy, 4 months old, house trained.",
      requested_at: addDays(now, -9),
      due_at: addDays(now, 19),
      status: "open",
      created_at: addDays(now, -9),
      updated_at: addDays(now, -9),
    });
    const t2 = tenancyList[13]!;
    data.pet_requests.push({
      id: nextId("pet_requests"),
      agency_id: A,
      branch_id: B,
      tenancy_id: t2.id,
      renter_id: t2.renterId,
      pet_description: "Two indoor cats, both neutered and vaccinated.",
      requested_at: addDays(now, -60),
      due_at: addDays(now, -32),
      status: "approved",
      decision_at: addDays(now, -50),
      decision_notes: "Approved by landlord. Pet damage insurance confirmed.",
      created_at: addDays(now, -60),
      updated_at: addDays(now, -50),
    });
  }

  // Tickets, messages, work orders, works invoices -------------------------------------
  type CompletedJob = {
    workOrderId: string;
    invoiceId: string;
    propertyId: string;
    landlordId: string;
    tenancyId: string | null;
    amount: number;
    dated: string;
    summary: string;
  };
  const completedJobs: CompletedJob[] = [];
  for (const ticket of TICKETS) {
    const ticketId = nextId("tickets");
    const tenancy = tenancyList[ticket.property] ?? null;
    const createdAt = addDays(now, -ticket.daysAgo);
    data.tickets.push({
      id: ticketId,
      agency_id: A,
      branch_id: B,
      property_id: propertyIds[ticket.property],
      tenancy_id: tenancy?.id ?? null,
      reported_by_type: tenancy ? "renter" : "staff",
      reported_by_id: tenancy?.renterId ?? null,
      source: tenancy ? "portal" : "staff",
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      summary: ticket.summary,
      description: ticket.description,
      location_area: ticket.location ?? null,
      is_emergency: ticket.emergency ?? false,
      created_at: createdAt,
      updated_at: addDays(createdAt, Math.min(ticket.daysAgo, 2)),
    });
    (ticket.messages ?? [[tenancy ? "renter" : "staff", ticket.description]]).forEach(([sender, body], m) => {
      data.ticket_messages.push({
        id: nextId("ticket_messages"),
        agency_id: A,
        branch_id: B,
        ticket_id: ticketId,
        sender_type: sender,
        sender_id: sender === "renter" ? tenancy?.renterId ?? null : null,
        channel: "portal",
        body,
        raw_payload: null,
        created_at: new Date(createdAt.getTime() + m * 3 * 3600000),
      });
    });

    if (!ticket.work) continue;
    const wo = ticket.work;
    const workOrderId = nextId("work_orders");
    const scheduledFor = addDays(now, wo.scheduledInDays);
    scheduledFor.setUTCHours(9, 30, 0, 0);
    const completed = wo.status === "completed";
    const landlordId = landlordIds[PROPERTY_LANDLORD[ticket.property]!]!;
    let invoiceId: string | null = null;
    if (completed) invoiceId = nextId("invoices");
    data.work_orders.push({
      id: workOrderId,
      agency_id: A,
      branch_id: B,
      ticket_id: ticketId,
      contractor_id: contractorIds[wo.contractor],
      scheduled_for: scheduledFor,
      status: wo.status,
      cost_estimate: wo.estimate,
      final_cost: wo.final ?? null,
      meta: completed ? { cost_posted: true, invoice_id: invoiceId } : {},
      created_at: addDays(createdAt, 1),
    });
    if (completed && invoiceId) {
      completedJobs.push({
        workOrderId,
        invoiceId,
        propertyId: propertyIds[ticket.property]!,
        landlordId,
        tenancyId: tenancy?.id ?? null,
        amount: wo.final ?? wo.estimate,
        dated: isoDate(scheduledFor),
        summary: ticket.summary,
      });
    }
  }

  // Rent: invoices, payments, allocations, tenancy ledger, landlord ledger -------------
  const historyStart = firstOfMonth(now, -12);
  const nextDue = firstOfMonth(now, 1);
  let externalRef = 1000;
  type LandlordEntry = DemoRow & { landlord_id: string; occurred_at: Date; entry_type: string; amount: number };
  const landlordLedger: LandlordEntry[] = [];
  const bankFeedPayments: Array<{ paymentId: string; invoiceId: string; tenancyId: string; amount: number; paidAt: Date; ref: string; name: string }> = [];

  const pushLandlord = (row: Omit<LandlordEntry, "id" | "agency_id" | "branch_id">) => {
    landlordLedger.push({
      id: nextId("landlord_ledger_entries"),
      agency_id: A,
      branch_id: B,
      meta: {},
      ...row,
    } as unknown as LandlordEntry);
  };

  for (const t of tenancyList) {
    const renter = data.renters.find((r) => r.id === t.renterId)!;
    const renterName = `${renter.first_name} ${renter.last_name}`;
    const paymentRef = (data.tenancies.find((x) => x.id === t.id)!.metadata as { payment_ref: string }).payment_ref;
    const firstDue = t.start.getTime() > historyStart.getTime() ? t.start : historyStart;
    const dues: Date[] = [];
    for (let d = firstOfMonth(firstDue); d.getTime() <= nextDue.getTime(); d = firstOfMonth(d, 1)) {
      if (d.getTime() >= t.start.getTime()) dues.push(d);
    }

    const ledger = (row: DemoRow) =>
      data.ledger_entries.push({
        id: nextId("ledger_entries"),
        agency_id: A,
        branch_id: B,
        tenancy_id: t.id,
        property_id: t.propertyId,
        landlord_id: t.landlordId,
        meta: {},
        ...row,
      });

    dues.forEach((due) => {
      const dueIso = isoDate(due);
      const isFuture = due.getTime() > now.getTime();
      const monthsBack = (firstOfMonth(now).getTime() - due.getTime()) / (30 * 86400000);
      const raisedAt = addMonths(due, -1);
      raisedAt.setUTCHours(6, 0, 0, 0);
      const invoiceId = nextId("invoices");

      // How this month's rent was paid.
      let pays: Array<{ amount: number; at: Date }> = [];
      if (!isFuture) {
        const onTime = addDays(due, Math.floor(rnd() * 3));
        onTime.setUTCHours(10 + Math.floor(rnd() * 6), Math.floor(rnd() * 60));
        if (t.profile === "good" || t.profile === "new") pays = [{ amount: t.rent, at: onTime }];
        else if (t.profile === "late") pays = [{ amount: t.rent, at: addDays(onTime, 9 + Math.floor(rnd() * 6)) }];
        else if (t.profile === "partial") {
          // Pays most of the rent on time and tops up mid-month, except the last two months.
          pays =
            monthsBack < 1.5
              ? [{ amount: money(t.rent - 150), at: onTime }]
              : [
                  { amount: money(t.rent - 150), at: onTime },
                  { amount: 150, at: addDays(onTime, 14) },
                ];
        } else if (t.profile === "arrears") {
          // Paid reliably until two months ago, then stopped.
          pays = monthsBack < 1.5 ? [] : [{ amount: t.rent, at: onTime }];
        }
        pays = pays.filter((p) => p.at.getTime() <= now.getTime());
      }
      const paid = money(pays.reduce((s, p) => s + p.amount, 0));
      const status = isFuture || paid <= 0 ? "due" : paid + 0.001 >= t.rent ? "paid" : "partial";

      data.invoices.push({
        id: invoiceId,
        agency_id: A,
        branch_id: B,
        tenancy_id: t.id,
        property_id: t.propertyId,
        landlord_id: t.landlordId,
        work_order_id: null,
        type: "rent",
        due_date: dueIso,
        amount: t.rent,
        status,
        meta: {},
        created_at: raisedAt,
      });
      ledger({
        entry_type: "charge",
        amount: t.rent,
        occurred_at: raisedAt,
        invoice_id: invoiceId,
        payment_id: null,
        memo: `rent charge due ${dueIso}`,
        created_at: raisedAt,
      });

      pays.forEach((pay) => {
        const paymentId = nextId("payments");
        const ref = `DEMO-BANK-${externalRef++}`;
        data.payments.push({
          id: paymentId,
          agency_id: A,
          branch_id: B,
          tenancy_id: t.id,
          invoice_id: invoiceId,
          amount: pay.amount,
          paid_at: pay.at,
          method: "bank_transfer",
          external_ref: ref,
          meta: { payment_ref: paymentRef },
          created_at: pay.at,
        });
        ledger({
          entry_type: "payment",
          amount: -pay.amount,
          occurred_at: pay.at,
          invoice_id: invoiceId,
          payment_id: paymentId,
          memo: "Payment via bank_transfer",
          created_at: pay.at,
        });
        data.payment_allocations.push({
          id: nextId("payment_allocations"),
          agency_id: A,
          branch_id: B,
          payment_id: paymentId,
          invoice_id: invoiceId,
          amount: pay.amount,
          created_at: pay.at,
        });
        ledger({
          entry_type: "allocation",
          amount: 0,
          occurred_at: pay.at,
          invoice_id: invoiceId,
          payment_id: paymentId,
          memo: `Allocated £${pay.amount.toFixed(2)} to invoice`,
          meta: { allocated: pay.amount },
          created_at: pay.at,
        });
        const fee = money(pay.amount * (MANAGEMENT_FEE_PERCENT / 100));
        pushLandlord({
          landlord_id: t.landlordId,
          property_id: t.propertyId,
          tenancy_id: t.id,
          entry_type: "rent_received",
          amount: pay.amount,
          occurred_at: pay.at,
          payment_id: paymentId,
          memo: "Rent received",
          created_at: pay.at,
        });
        pushLandlord({
          landlord_id: t.landlordId,
          property_id: t.propertyId,
          tenancy_id: t.id,
          entry_type: "management_fee",
          amount: -fee,
          occurred_at: pay.at,
          payment_id: paymentId,
          memo: `Management fee ${MANAGEMENT_FEE_PERCENT}%`,
          meta: { fee_percent: MANAGEMENT_FEE_PERCENT },
          created_at: pay.at,
        });
        if (now.getTime() - pay.at.getTime() < 62 * 86400000) {
          bankFeedPayments.push({ paymentId, invoiceId, tenancyId: t.id, amount: pay.amount, paidAt: pay.at, ref: paymentRef, name: renterName });
        }
        if (pay.amount + 0.001 < t.rent && pays.length === 1) {
          data.payment_exceptions.push({
            id: nextId("payment_exceptions"),
            agency_id: A,
            branch_id: B,
            tenancy_id: t.id,
            payment_id: paymentId,
            invoice_id: invoiceId,
            kind: "underpayment",
            amount: money(t.rent - pay.amount),
            status: "open",
            note: `Partial payment; £${money(t.rent - pay.amount).toFixed(2)} remaining`,
            meta: {},
            created_at: pay.at,
          });
        }
      });

      // Late fee for rent left unpaid past the 7-day grace period.
      if (!isFuture && status !== "paid" && now.getTime() - due.getTime() > 8 * 86400000 && t.profile === "arrears") {
        const feeId = nextId("invoices");
        const feeDue = addDays(due, 8);
        data.invoices.push({
          id: feeId,
          agency_id: A,
          branch_id: B,
          tenancy_id: t.id,
          property_id: t.propertyId,
          landlord_id: t.landlordId,
          work_order_id: null,
          type: "late_fee",
          due_date: isoDate(feeDue),
          amount: 25,
          status: "due",
          meta: { source_invoice_id: invoiceId },
          created_at: feeDue,
        });
        ledger({
          entry_type: "charge",
          amount: 25,
          occurred_at: feeDue,
          invoice_id: feeId,
          payment_id: null,
          memo: `late_fee charge due ${isoDate(feeDue)}`,
          created_at: feeDue,
        });
      }
    });
  }

  // Works invoices and costs to landlords.
  const currentStatementFrom = firstOfMonth(now);
  for (const job of completedJobs) {
    const billed = job.dated < isoDate(currentStatementFrom);
    data.invoices.push({
      id: job.invoiceId,
      agency_id: A,
      branch_id: B,
      tenancy_id: job.tenancyId,
      property_id: job.propertyId,
      landlord_id: job.landlordId,
      work_order_id: job.workOrderId,
      type: WORKS_INVOICE_TYPE,
      due_date: job.dated,
      amount: job.amount,
      status: billed ? WORKS_INVOICE_BILLED : WORKS_INVOICE_PENDING,
      meta: {
        work_order_id: job.workOrderId,
        ticket_summary: job.summary,
        property_address: addressOf.get(job.propertyId),
      },
      created_at: new Date(`${job.dated}T17:00:00.000Z`),
    });
    pushLandlord({
      landlord_id: job.landlordId,
      property_id: job.propertyId,
      tenancy_id: job.tenancyId,
      entry_type: "work_order_cost",
      amount: -job.amount,
      occurred_at: new Date(`${job.dated}T12:00:00.000Z`),
      work_order_id: job.workOrderId,
      invoice_id: job.invoiceId,
      memo: `Works: ${job.summary}`,
      created_at: new Date(`${job.dated}T17:00:00.000Z`),
    });
  }

  // Monthly statements for the last six complete months, each followed by a payout.
  const landlordNames = new Map(data.landlords.map((l) => [l.id as string, `${l.first_name} ${l.last_name}`]));
  const jobByWorkOrder = new Map(completedJobs.map((j) => [j.workOrderId, j]));
  for (let m = 6; m >= 1; m--) {
    const from = firstOfMonth(now, -m);
    const to = lastOfMonth(from);
    const fromIso = isoDate(from);
    const toIso = isoDate(to);
    const issuedAt = addDays(to, 2);
    issuedAt.setUTCHours(9, 0, 0, 0);
    const toEnd = new Date(`${toIso}T23:59:59.999Z`).getTime();

    for (const landlordId of landlordIds) {
      const entries = landlordLedger.filter(
        (e) => e.landlord_id === landlordId && e.occurred_at.getTime() >= from.getTime() && e.occurred_at.getTime() <= toEnd
      );
      if (entries.length === 0) continue;
      const totals = groupLandlordStatementTotals({
        entries: entries.map((e) => {
          let work: LandlordStatementWorkLine | null = null;
          if (e.entry_type === "work_order_cost") {
            const job = jobByWorkOrder.get(e.work_order_id as string);
            work = {
              dated: job?.dated ?? isoDate(e.occurred_at),
              address: job ? addressOf.get(job.propertyId) ?? "" : "",
              summary: job?.summary ?? "Maintenance",
              amount: Math.abs(e.amount),
            };
          }
          return { propertyId: (e.property_id as string | null) ?? null, entryType: e.entry_type, amount: e.amount, work };
        }),
        propertyAddressById: addressOf,
      });
      const name = landlordNames.get(landlordId) ?? "";
      const statementId = nextId("landlord_statements");
      const docId = nextId("documents");
      data.documents.push({
        id: docId,
        agency_id: A,
        branch_id: B,
        entity_type: "landlord",
        entity_id: landlordId,
        kind: "statement",
        url: statementDownloadPath(statementId),
        filename: `statement-${fromIso}-${toIso}.pdf`,
        meta: {},
        created_at: issuedAt,
      });
      data.landlord_statements.push({
        id: statementId,
        agency_id: A,
        branch_id: B,
        landlord_id: landlordId,
        property_id: null,
        parent_statement_id: null,
        period_from: fromIso,
        period_to: toIso,
        totals,
        document_id: docId,
        status: "issued",
        issued_at: issuedAt,
        created_at: issuedAt,
      });
      for (const e of entries) if (e.entry_type === "work_order_cost") e.statement_id = statementId;

      for (const property of propertiesForIndividualStatements(totals)) {
        const childId = nextId("landlord_statements");
        const childDoc = nextId("documents");
        data.documents.push({
          id: childDoc,
          agency_id: A,
          branch_id: B,
          entity_type: "landlord",
          entity_id: landlordId,
          kind: "statement",
          url: statementDownloadPath(childId),
          filename: statementDownloadFilename(name, fromIso, toIso, property.address),
          meta: {},
          created_at: issuedAt,
        });
        data.landlord_statements.push({
          id: childId,
          agency_id: A,
          branch_id: B,
          landlord_id: landlordId,
          property_id: property.id,
          parent_statement_id: statementId,
          period_from: fromIso,
          period_to: toIso,
          totals: propertyStatementTotals(property),
          document_id: childDoc,
          status: "issued",
          issued_at: issuedAt,
          created_at: issuedAt,
        });
      }

      // Pay out the client balance a day after the statement goes out.
      const balance = money(
        landlordLedger
          .filter((e) => e.landlord_id === landlordId && e.occurred_at.getTime() <= toEnd)
          .reduce((s, e) => s + e.amount, 0)
      );
      if (balance > 0) {
        const payoutId = nextId("landlord_payouts");
        const paidAt = addDays(issuedAt, 1);
        data.landlord_payouts.push({
          id: payoutId,
          agency_id: A,
          branch_id: B,
          landlord_id: landlordId,
          amount: balance,
          paid_at: paidAt,
          method: "bank_transfer",
          external_ref: `PAYOUT-${fromIso.slice(0, 7)}-${String(landlordIds.indexOf(landlordId) + 1).padStart(2, "0")}`,
          statement_ids: [statementId],
          meta: {},
          created_at: paidAt,
        });
        pushLandlord({
          landlord_id: landlordId,
          property_id: null,
          tenancy_id: null,
          entry_type: "payout",
          amount: -balance,
          occurred_at: paidAt,
          memo: "Landlord payout",
          meta: { payout_id: payoutId },
          created_at: paidAt,
        });
      }
    }
  }
  data.landlord_ledger_entries.push(...landlordLedger);

  // Bank feed: last two months of receipts, plus a couple waiting to be matched.
  const connectionId = nextId("bank_connections");
  data.bank_connections.push({
    id: connectionId,
    agency_id: A,
    branch_id: B,
    provider: "csv",
    status: "active",
    account_name: "Client Account",
    account_number_mask: "****0000",
    sort_code_mask: "**-**-00",
    last_synced_at: addDays(now, -1),
    meta: {},
    created_at: addMonths(now, -10),
    updated_at: addDays(now, -1),
  });
  bankFeedPayments.forEach((p, i) => {
    data.bank_transactions.push({
      id: nextId("bank_transactions"),
      agency_id: A,
      branch_id: B,
      connection_id: connectionId,
      provider_txn_id: `demo_txn_${i + 1}`,
      booked_at: p.paidAt,
      amount: p.amount,
      currency: "GBP",
      description: `${p.ref} RENT`,
      counterparty: p.name.toUpperCase(),
      match_status: "matched",
      payment_id: p.paymentId,
      invoice_id: p.invoiceId,
      tenancy_id: p.tenancyId,
      raw: {},
      created_at: p.paidAt,
    });
  });
  const unmatched: Array<[number, string, string, number]> = [
    [2, "FASTER PAYMENT FLAT 6 RENT", "M NICHOLSON", 550],
    [4, "STANDING ORDER", "J PEARSON", 320],
  ];
  unmatched.forEach(([daysAgo, description, counterparty, amount], i) => {
    data.bank_transactions.push({
      id: nextId("bank_transactions"),
      agency_id: A,
      branch_id: B,
      connection_id: connectionId,
      provider_txn_id: `demo_txn_unmatched_${i + 1}`,
      booked_at: addDays(now, -daysAgo),
      amount,
      currency: "GBP",
      description,
      counterparty,
      match_status: "pending",
      raw: {},
      created_at: addDays(now, -daysAgo),
    });
  });

  // Lettings pipeline on the vacant homes ------------------------------------------
  const enquirers: Array<[string, string, string, number, number]> = [
    ["Rebecca Shaw", "Hi, is the property still available? I'd love to arrange a viewing this week.", "viewing_booked", 26, 3],
    ["Mohammed Ali", "We're a family of four relocating for work. Is parking included?", "application", 26, 6],
    ["Jack Harrison", "Can I view on Saturday?", "new", 27, 1],
    ["Emily Watson", "Is the flat suitable for a professional couple with a small dog?", "referencing", 27, 9],
    ["Daniel Price", "Interested, please call me back.", "new", 28, 0],
    ["Olivia Grant", "Is the garden private? When is it available from?", "viewing_booked", 28, 4],
    ["Sam Kirby", "No longer looking, thanks.", "closed_lost", 26, 14],
    ["Natalie Coates", "Offer submitted at asking price.", "offer", 27, 11],
  ];
  const enquiryIds: string[] = [];
  enquirers.forEach(([name, message, stage, pi, daysAgo], i) => {
    const id = nextId("enquiries");
    enquiryIds.push(id);
    data.enquiries.push({
      id,
      agency_id: A,
      property_id: propertyIds[pi],
      name,
      email: `${slugify(name).replace("-", ".")}@example.com`,
      phone: phone(500 + i),
      message,
      source: i % 3 === 0 ? "rightmove" : i % 3 === 1 ? "website" : "zoopla",
      status: stage,
      pipeline_stage: stage,
      created_at: addDays(now, -daysAgo),
    });
  });
  [[0, 2, null], [1, -3, "Keen. Sending application link."], [3, -6, "Liked it. Asked about pets."], [5, 1, null], [7, -8, "Second viewing. Offer to follow."]].forEach(
    ([ei, inDays, outcome]) => {
      const at = addDays(now, inDays as number);
      at.setUTCHours(17, 30, 0, 0);
      data.viewings.push({
        id: nextId("viewings"),
        agency_id: A,
        branch_id: B,
        property_id: data.enquiries[ei as number]!.property_id,
        enquiry_id: enquiryIds[ei as number],
        scheduled_at: at,
        outcome: outcome ? "attended" : null,
        notes: outcome,
        created_at: addDays(now, -(enquirers[ei as number]![4])),
      });
    }
  );
  [
    ["Mohammed", "Ali", 26, "reviewing", "in_progress", 48000, 4],
    ["Emily", "Watson", 27, "submitted", "pending", 36500, 1],
    ["Natalie", "Coates", 27, "approved", "passed", 41000, 2],
    ["Ben", "Lockwood", 28, "rejected", "failed", 18000, 3],
  ].forEach(([first, last, pi, status, referencing, income, occupants], i) => {
    data.tenant_applications.push({
      id: nextId("tenant_applications"),
      agency_id: A,
      property_id: propertyIds[pi as number],
      status,
      referencing_status: referencing,
      first_name: first,
      last_name: last,
      email: `${String(first).toLowerCase()}.${String(last).toLowerCase()}@example.com`,
      phone: phone(600 + i),
      employment_status: "employed",
      annual_income: income,
      current_address: `${10 + i} Example Street, Stockton-on-Tees, TS18 1AA`,
      move_in_date: isoDate(addDays(now, 21 + i * 7)),
      occupants,
      pets: i === 1,
      pets_details: i === 1 ? "One small dog (cockapoo)" : null,
      reference_data: {},
      additional_info: null,
      created_at: addDays(now, -(8 - i)),
    });
  });

  // Complaints + tasks --------------------------------------------------------------
  data.complaints.push(
    {
      id: nextId("complaints"),
      agency_id: A,
      property_id: propertyIds[4],
      tenant_name: `${RENTER_FIRST[4]} ${RENTER_LAST[4]}`,
      tenant_email: `${RENTER_FIRST[4]}.${RENTER_LAST[4]}@example.com`.toLowerCase(),
      subject: "Slow response to mould report",
      description: "I reported mould three weeks ago and nobody has been out yet.",
      status: "investigating",
      priority: "high",
      source: "portal",
      sla_due_at: addDays(now, 5),
      created_at: addDays(now, -3),
    },
    {
      id: nextId("complaints"),
      agency_id: A,
      property_id: propertyIds[1],
      tenant_name: `${RENTER_FIRST[1]} ${RENTER_LAST[1]}`,
      tenant_email: `${RENTER_FIRST[1]}.${RENTER_LAST[1]}@example.com`.toLowerCase(),
      subject: "Contractor arrived without notice",
      description: "The locksmith turned up a day early without calling first.",
      status: "resolved",
      priority: "medium",
      source: "email",
      sla_due_at: addDays(now, -50),
      resolved_at: addDays(now, -55),
      created_at: addDays(now, -62),
    }
  );
  const taskSeeds: Array<[string, number, string, string | null, string | null]> = [
    ["Chase arrears: 19 Linthorpe Terrace", 1, "open", "tenancy", tenancyList[7]!.id],
    ["Chase arrears: 21 Albert Hill Row", 2, "open", "tenancy", tenancyList[21]!.id],
    ["Renew gas safety: 45 Crossgate Peth (expired)", 0, "open", "property", propertyIds[19]!],
    ["Serve RRA information sheet to new tenants", 3, "open", null, null],
    ["Get landlord approval for damp works", 1, "open", "property", propertyIds[4]!],
    ["Book check-in for 30 Brinkburn Road", 10, "open", "property", propertyIds[26]!],
    ["Send last month's landlord statements", -25, "done", null, null],
    ["Renew landlord licence: Hartlepool", 25, "open", null, null],
  ];
  taskSeeds.forEach(([title, dueInDays, status, relatedType, relatedId]) => {
    data.tasks.push({
      id: nextId("tasks"),
      agency_id: A,
      branch_id: B,
      title,
      due_at: addDays(now, dueInDays),
      status,
      related_type: relatedType,
      related_id: relatedId,
      assignee_staff_id: null,
      meta: {},
      created_at: addDays(now, Math.min(dueInDays, 0) - 5),
    });
  });

  return data;
}
