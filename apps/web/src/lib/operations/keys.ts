/** Keys register: who can hold a set of keys. */
export const KEY_HOLDERS = ["office", "tenant", "landlord", "contractor", "other"] as const;
export type KeyHolder = (typeof KEY_HOLDERS)[number];

export function describeHolder(k: { holderType: string; holderName: string | null }): string {
  if (k.holderType === "office") return "In the office";
  const who = k.holderName?.trim();
  const type = k.holderType.charAt(0).toUpperCase() + k.holderType.slice(1);
  return who ? `${type}: ${who}` : type;
}
