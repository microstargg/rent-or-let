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

export function defaultInspectionReport(bedrooms: number): InspectionReport {
  const rooms = [
    { name: "Entrance / hall", notes: "", elements: defaultElements("Doors", "Walls", "Flooring", "Lighting") },
    { name: "Kitchen", notes: "", elements: defaultElements("Units", "Worktops", "Appliances", "Sink") },
    { name: "Living room", notes: "", elements: defaultElements("Walls", "Flooring", "Windows", "Radiator") },
  ];
  const n = Math.max(1, Math.min(bedrooms || 1, 6));
  for (let i = 1; i <= n; i++) {
    rooms.push({
      name: `Bedroom ${i}`,
      notes: "",
      elements: defaultElements("Walls", "Flooring", "Windows", "Radiator"),
    });
  }
  rooms.push({
    name: "Bathroom",
    notes: "",
    elements: defaultElements("Suite", "Tiling", "Extractor", "Flooring"),
  });
  rooms.push({
    name: "Exterior",
    notes: "",
    elements: defaultElements("Doors", "Windows", "Garden / yard"),
  });
  return {
    rooms,
    meters: [
      { type: "electricity", reading: "", photoUrl: "" },
      { type: "gas", reading: "", photoUrl: "" },
      { type: "water", reading: "", photoUrl: "" },
    ],
  };
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
