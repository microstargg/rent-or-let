export const PET_REQUEST_STATUSES = [
  "open",
  "info_requested",
  "awaiting_superior",
  "approved",
  "refused",
  "deemed_open",
] as const;

export type PetRequestStatus = (typeof PET_REQUEST_STATUSES)[number];

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function initialPetDueAt(requestedAt: Date = new Date()): Date {
  return addDays(requestedAt, 28);
}

/** s.16A(2): after tenant provides further information, 7 more days. */
export function dueAfterFurtherInfo(infoReceivedAt: Date = new Date()): Date {
  return addDays(infoReceivedAt, 7);
}

/** s.16A(3): after superior landlord responds, 7 more days. */
export function dueAfterSuperiorResponse(receivedAt: Date = new Date()): Date {
  return addDays(receivedAt, 7);
}

export function isPetRequestOverdue(opts: {
  status: string;
  dueAt: Date | string;
  now?: Date;
}): boolean {
  if (["approved", "refused"].includes(opts.status)) return false;
  const due = opts.dueAt instanceof Date ? opts.dueAt : new Date(opts.dueAt);
  return (opts.now ?? new Date()) > due;
}
