export interface EpcCertificate {
  lmkKey: string;
  address: string;
  postcode: string;
  currentRating: string;
  lodgementDate: string | null;
  expiryDate: string | null;
  certificateUrl: string;
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function normaliseAddress(value: string): string {
  return value.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreMatch(rowAddress: string, house: string, street: string): number {
  const hay = normaliseAddress(rowAddress);
  const num = house.trim().toLowerCase();
  const st = street.trim().toLowerCase();
  let score = 0;
  if (num && hay.includes(num)) score += 4;
  if (st && hay.includes(st)) score += 3;
  return score;
}

function mapRow(row: Record<string, unknown>): EpcCertificate {
  const lmkKey = String(row["lmk-key"] ?? row.lmkKey ?? "");
  const address = String(row.address ?? "");
  const postcode = String(row.postcode ?? "");
  const currentRating = String(row["current-energy-rating"] ?? row.currentRating ?? "").toUpperCase();
  const lodgement = (row["lodgement-date"] ?? row.lodgementDate ?? null) as string | null;
  const expiry = lodgement ? addYears(lodgement.slice(0, 10), 10) : null;
  const certificateUrl = lmkKey
    ? `https://find-energy-certificate.service.gov.uk/energy-certificate/${encodeURIComponent(lmkKey)}`
    : "";
  return {
    lmkKey,
    address,
    postcode,
    currentRating,
    lodgementDate: lodgement ? String(lodgement).slice(0, 10) : null,
    expiryDate: expiry,
    certificateUrl,
  };
}

export function isEpcConfigured(): boolean {
  return Boolean(process.env.EPC_API_EMAIL?.trim() && process.env.EPC_API_KEY?.trim());
}

export async function searchEpcCertificates(opts: {
  postcode: string;
  houseNameNumber?: string;
  street?: string;
}): Promise<{ matches: EpcCertificate[]; best: EpcCertificate | null }> {
  if (!isEpcConfigured()) {
    throw new Error(
      "EPC lookup is not configured. Set EPC_API_EMAIL and EPC_API_KEY from the MHCLG Open Data Communities EPC API."
    );
  }
  const postcode = opts.postcode.trim().toUpperCase().replace(/\s+/g, " ");
  const url = new URL("https://epc.opendatacommunities.org/api/v1/domestic/search");
  url.searchParams.set("postcode", postcode);
  url.searchParams.set("size", "25");

  const auth = Buffer.from(
    `${process.env.EPC_API_EMAIL!.trim()}:${process.env.EPC_API_KEY!.trim()}`
  ).toString("base64");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  if (!res.ok) {
    throw new Error(`EPC register returned ${res.status}`);
  }
  const json = (await res.json()) as { rows?: Record<string, unknown>[] };
  const matches = (json.rows ?? []).map(mapRow).filter((m) => m.currentRating);
  if (!matches.length) return { matches: [], best: null };

  const ranked = [...matches].sort(
    (a, b) =>
      scoreMatch(b.address, opts.houseNameNumber ?? "", opts.street ?? "") -
      scoreMatch(a.address, opts.houseNameNumber ?? "", opts.street ?? "")
  );
  const top = ranked[0];
  const topScore = scoreMatch(top.address, opts.houseNameNumber ?? "", opts.street ?? "");
  const uniqueBest = topScore >= 4 ? top : null;
  return { matches: ranked.slice(0, 8), best: uniqueBest };
}
