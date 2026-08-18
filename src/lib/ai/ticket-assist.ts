import { z } from "zod";
import { generateAiObject, generateAiText } from "./client";

export const TicketTriageSchema = z.object({
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum([
    "plumbing",
    "electrical",
    "heating",
    "gas",
    "appliance",
    "damp_mould",
    "locks_security",
    "pest",
    "structural",
    "garden",
    "other",
  ]),
  isEmergency: z.boolean(),
  tradeHint: z.string(),
  rationale: z.string(),
});

export type TicketTriageSuggestion = z.infer<typeof TicketTriageSchema>;

export async function suggestTicketTriage(input: {
  summary: string;
  description?: string | null;
}): Promise<TicketTriageSuggestion> {
  return generateAiObject({
    schema: TicketTriageSchema,
    system:
      "You triage UK residential maintenance for a letting agent. " +
      "Emergencies: no heat in winter, no water, serious electrical, gas smell, insecure property, sewage. " +
      "Do not invent facts. If unsure, choose medium priority and other.",
    prompt: `Summary: ${input.summary}\n\nDescription: ${input.description ?? "(none)"}`,
  });
}

export async function draftTicketReply(input: {
  summary: string;
  description?: string | null;
  propertyAddress?: string;
  messages?: { senderType: string; body: string }[];
}): Promise<string> {
  const thread = (input.messages ?? [])
    .slice(-8)
    .map((m) => `${m.senderType}: ${m.body}`)
    .join("\n");
  const text = await generateAiText(
    [
      `Property: ${input.propertyAddress ?? "unknown"}`,
      `Ticket: ${input.summary}`,
      `Details: ${input.description ?? "(none)"}`,
      thread ? `Thread:\n${thread}` : "",
      "Write a short staff reply to the tenant. British English. Be practical. Do not promise legal outcomes, eviction, or rent reductions. Do not invent appointment times. Sign off as the property management team.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    "You draft letting-agency maintenance replies. Staff will edit and send. Never claim a contractor is booked unless the thread says so."
  );
  return text;
}
