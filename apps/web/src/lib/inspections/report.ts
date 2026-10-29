import { z } from "zod";

export const INSPECTION_TYPES = ["move_in", "interim", "move_out"] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const ELEMENT_CONDITIONS = ["excellent", "good", "fair", "poor", "missing"] as const;

export const inspectionElementSchema = z.object({
  name: z.string().min(1),
  condition: z.enum(ELEMENT_CONDITIONS).default("good"),
  notes: z.string().optional().default(""),
  photoUrls: z.array(z.string()).default([]),
});

export const inspectionRoomSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional().default(""),
  photoUrls: z.array(z.string()).default([]),
  done: z.boolean().default(false),
  elements: z.array(inspectionElementSchema).default([]),
});

export const inspectionMeterSchema = z.object({
  type: z.enum(["electricity", "gas", "water"]),
  reading: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
});

export const inspectionReportSchema = z.object({
  rooms: z.array(inspectionRoomSchema).default([]),
  meters: z.array(inspectionMeterSchema).default([]),
});

export type InspectionReport = z.infer<typeof inspectionReportSchema>;

export function emptyInspectionReport(): InspectionReport {
  return { rooms: [], meters: [] };
}

export function parseInspectionReport(meta: unknown): InspectionReport {
  if (meta && typeof meta === "object" && "report" in meta) {
    const nested = inspectionReportSchema.safeParse((meta as { report: unknown }).report);
    if (nested.success) return nested.data;
  }
  const parsed = inspectionReportSchema.safeParse(meta ?? {});
  if (parsed.success) return parsed.data;
  return emptyInspectionReport();
}

/** Check-in report a move-out is compared against (stored on the move-out's meta). */
export function parseBaselineReport(meta: unknown): InspectionReport | null {
  if (!meta || typeof meta !== "object" || !("baseline" in meta)) return null;
  const parsed = inspectionReportSchema.safeParse((meta as { baseline: unknown }).baseline);
  return parsed.success ? parsed.data : null;
}

/** Same rooms and items as the check-in, with notes, photos and readings cleared for the new visit. */
export function reportFromBaseline(baseline: InspectionReport): InspectionReport {
  return {
    rooms: baseline.rooms.map((room) => ({
      name: room.name,
      notes: "",
      photoUrls: [],
      done: false,
      elements: room.elements.map((el) => ({
        name: el.name,
        condition: el.condition,
        notes: "",
        photoUrls: [],
      })),
    })),
    meters: baseline.meters.map((m) => ({ type: m.type, reading: "", photoUrl: "" })),
  };
}

export function defaultInspectionReport(bedrooms: number): InspectionReport {
  const rooms = [
    defaultRoom("Entrance / hall", "Doors", "Walls", "Flooring", "Lighting"),
    defaultRoom("Kitchen", "Units", "Worktops", "Appliances", "Sink"),
    defaultRoom("Living room", "Walls", "Flooring", "Windows", "Radiator"),
  ];
  const n = Math.max(1, Math.min(bedrooms || 1, 6));
  for (let i = 1; i <= n; i++) {
    rooms.push(defaultRoom(`Bedroom ${i}`, "Walls", "Flooring", "Windows", "Radiator"));
  }
  rooms.push(defaultRoom("Bathroom", "Suite", "Tiling", "Extractor", "Flooring"));
  rooms.push(defaultRoom("Exterior", "Doors", "Windows", "Garden / yard"));
  return {
    rooms,
    meters: [
      { type: "electricity", reading: "", photoUrl: "" },
      { type: "gas", reading: "", photoUrl: "" },
      { type: "water", reading: "", photoUrl: "" },
    ],
  };
}

function defaultRoom(name: string, ...elements: string[]): InspectionReport["rooms"][number] {
  return { name, notes: "", photoUrls: [], done: false, elements: defaultElements(...elements) };
}

function defaultElements(...names: string[]) {
  return names.map((name) => ({ name, condition: "good" as const, notes: "", photoUrls: [] }));
}

export function addMonthsIso(startDate: string, months: number): Date {
  const d = new Date(`${startDate}T10:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}
