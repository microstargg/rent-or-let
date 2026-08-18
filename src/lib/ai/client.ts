import { generateObject, generateText } from "ai";
import type { z } from "zod";

const DEFAULT_MODEL = process.env.AI_MODEL?.trim() || "openai/gpt-4.1-mini";

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim() ||
      process.env.OPENAI_API_KEY?.trim()
  );
}

export function aiUnavailableMessage(): string {
  return "AI is not configured. Set AI_GATEWAY_API_KEY (or deploy on Vercel with AI Gateway) to enable drafts.";
}

export async function generateAiText(prompt: string, system?: string): Promise<string> {
  if (!isAiConfigured()) throw new Error(aiUnavailableMessage());
  const { text } = await generateText({
    model: DEFAULT_MODEL,
    system,
    prompt,
  });
  return text.trim();
}

export async function generateAiObject<T>(opts: {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
}): Promise<T> {
  if (!isAiConfigured()) throw new Error(aiUnavailableMessage());
  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
  });
  return object;
}
