import { generateObject, generateText, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { z } from "zod";
import {
  gatewayModelChain,
  googleModelChain,
  runWithModelFallbacks,
  toClientSafeAiError,
} from "./models";

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

type ModelCandidate = {
  label: string;
  model: LanguageModel | string;
  providerOptions?: { gateway: { models: string[] } };
};

/**
 * Prefers Google's free Generative Language API when a Google key is present,
 * then AI Gateway. Each path tries a Flash chain so a retired model id does
 * not surface to staff.
 */
function resolveModelCandidates(): ModelCandidate[] {
  const override = process.env.AI_MODEL?.trim();
  const googleKey = googleApiKey();
  const candidates: ModelCandidate[] = [];

  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    for (const id of googleModelChain(override)) {
      candidates.push({ label: `google:${id}`, model: google(id) });
    }
  }

  if (gatewayConfigured()) {
    const chain = gatewayModelChain(override);
    const [primary, ...fallbacks] = chain;
    candidates.push({
      label: `gateway:${primary}`,
      model: primary,
      providerOptions: fallbacks.length ? { gateway: { models: fallbacks } } : undefined,
    });
  }

  return candidates;
}

async function withAiFallback<T>(
  run: (candidate: ModelCandidate) => Promise<T>
): Promise<T> {
  if (!isAiConfigured()) throw new Error(aiUnavailableMessage());
  const candidates = resolveModelCandidates();
  try {
    return await runWithModelFallbacks(
      candidates,
      (candidate) => run(candidate),
      (candidate, err) => {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`AI model ${candidate.label} unavailable, trying fallback. ${reason}`);
      }
    );
  } catch (err) {
    console.error("AI generation failed", err);
    throw toClientSafeAiError(err, aiUnavailableMessage());
  }
}

export async function generateAiText(prompt: string, system?: string): Promise<string> {
  const text = await withAiFallback(async (candidate) => {
    const result = await generateText({
      model: candidate.model,
      system,
      prompt,
      ...(candidate.providerOptions ? { providerOptions: candidate.providerOptions } : {}),
    });
    return result.text.trim();
  });
  return text;
}

export async function generateAiObject<T>(opts: {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
}): Promise<T> {
  return withAiFallback(async (candidate) => {
    const { object } = await generateObject({
      model: candidate.model,
      schema: opts.schema,
      system: opts.system,
      prompt: opts.prompt,
      ...(candidate.providerOptions ? { providerOptions: candidate.providerOptions } : {}),
    });
    return object;
  });
}
