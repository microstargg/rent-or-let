import { generateObject, generateText, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { z } from "zod";

/** Google AI Studio Flash. Swap via AI_MODEL when you move to paid. */
const GOOGLE_FLASH_MODEL = "gemini-3.6-flash";
/** Vercel AI Gateway slug when no Google key is set (Vercel deploy / paid path). */
const GATEWAY_MODEL = `google/${GOOGLE_FLASH_MODEL}`;

/** IDs Google has retired for new AI Studio keys — remap so leftover env vars cannot keep 2.5 live. */
const RETIRED_GOOGLE_MODELS: Record<string, string> = {
  "gemini-2.5-flash": GOOGLE_FLASH_MODEL,
  "gemini-2.5-flash-lite": GOOGLE_FLASH_MODEL,
  "gemini-2.5-pro": GOOGLE_FLASH_MODEL,
  "gemini-2.0-flash": GOOGLE_FLASH_MODEL,
  "gemini-2.0-flash-001": GOOGLE_FLASH_MODEL,
};

export function resolveGoogleModelId(requested?: string | null): string {
  const raw = (requested?.trim() || GOOGLE_FLASH_MODEL).replace(/^google\//, "");
  return RETIRED_GOOGLE_MODELS[raw] ?? raw;
}

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
    return google(resolveGoogleModelId(override));
  }

  if (!override) return GATEWAY_MODEL;
  const googleId = resolveGoogleModelId(override);
  return override.startsWith("google/") || !override.includes("/")
    ? `google/${googleId}`
    : override;
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
