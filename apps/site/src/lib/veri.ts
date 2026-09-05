/** Veri Properties agency id (registry slug). */
export const VERI_AGENCY_ID = "veri-properties";

export function isVeriAgency(id: string | undefined | null): boolean {
  return id === VERI_AGENCY_ID;
}

/** Tracked public hero — survives deploys without relying on gitignored /agencies/. */
export const VERI_HERO_SRC = "/media/veri-hero.jpg";
