import { generateObject, generateText, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { z } from "zod";

/** Google AI Studio free-tier Flash. Swap via AI_MODEL when you move to paid. */
const GOOGLE_FREE_MODEL = "gemini-2.5-flash";
/** Vercel AI Gateway slug when no Google key is set (Vercel deploy / paid path). */
const GATEWAY_MODEL = "google/gemini-3.7-flash";

function googleApiKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
}

function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

export function isAiConfigured(): boolean {
  return Boolean(googleApiKey() || gatewayConfigured());
}

export function aiUnavailableMessage(): string {
  return "AI is not configured. Add a free Google AI Studio key as GOOGLE_GENERATIVE_AI_API_KEY, or set AI_GATEWAY_API_KEY for Vercel AI Gateway.";
}

/**
 * Vercel AI SDK model. Prefers Google's free Generative Language API when a
 * Google key is present; otherwise routes `provider/model` strings through
 * AI Gateway so you can switch to a paid model without code changes.
 */
function resolveModel(): LanguageModel | string {
  const override = process.env.AI_MODEL?.trim();
  const googleKey = googleApiKey();

  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const modelId = override ? override.replace(/^google\//, "") : GOOGLE_FREE_MODEL;
    return google(modelId);
  }

  return override || GATEWAY_MODEL;
}

export async function generateAiText(prompt: string, system?: string): Promise<string> {
  if (!isAiConfigured()) throw new Error(aiUnavailableMessage());
  const { text } = await generateText({
    model: resolveModel(),
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
    model: resolveModel(),
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
  });
  return object;
}
