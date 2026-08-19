import { APICallError, NoSuchModelError } from "ai";

/** Google AI Studio default. Google currently points new keys at this Flash id. */
export const GOOGLE_PRIMARY_MODEL = "gemini-3.6-flash";

/** Tried in order when the primary Google model is retired or overloaded. */
export const GOOGLE_FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
] as const;

/** Vercel AI Gateway default when no Google key is set. */
export const GATEWAY_PRIMARY_MODEL = "google/gemini-3.7-flash";

/** Gateway failover slugs (native `providerOptions.gateway.models`). */
export const GATEWAY_FALLBACK_MODELS = [
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
] as const;

export const AI_FAILED_USER_MESSAGE =
  "Could not generate a response. Please try again in a moment.";

export const AI_BUSY_USER_MESSAGE = "AI is temporarily busy. Please try again in a moment.";

export function uniqueNonEmpty(ids: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function stripGooglePrefix(modelId: string): string {
  return modelId.replace(/^google\//, "");
}

export function toGatewaySlug(modelId: string): string {
  return modelId.includes("/") ? modelId : `google/${modelId}`;
}

/** Google AI Studio ids: optional override first, then current Flash, then backups. */
export function googleModelChain(override?: string | null): string[] {
  const preferred = override?.trim() ? stripGooglePrefix(override) : undefined;
  return uniqueNonEmpty([preferred, GOOGLE_PRIMARY_MODEL, ...GOOGLE_FALLBACK_MODELS]);
}

/** Gateway slugs: optional override first, then current Flash, then backups. */
export function gatewayModelChain(override?: string | null): string[] {
  const preferred = override?.trim() ? toGatewaySlug(override) : undefined;
  return uniqueNonEmpty([preferred, GATEWAY_PRIMARY_MODEL, ...GATEWAY_FALLBACK_MODELS]);
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return String(err);
}

function collectedErrorText(err: unknown): string {
  const parts = [errorText(err)];
  if (typeof err === "object" && err) {
    const rec = err as { responseBody?: unknown; cause?: unknown };
    if (typeof rec.responseBody === "string") parts.push(rec.responseBody);
    if (rec.cause) parts.push(errorText(rec.cause));
  }
  return parts.join("\n");
}

function statusCodeOf(err: unknown): number | undefined {
  if (APICallError.isInstance(err)) return err.statusCode;
  if (typeof err === "object" && err && "statusCode" in err) {
    const code = (err as { statusCode?: unknown }).statusCode;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

/** True when another model in the chain is worth trying. */
export function isFallbackWorthyError(err: unknown): boolean {
  if (NoSuchModelError.isInstance(err)) return true;

  const text = collectedErrorText(err);
  const lower = text.toLowerCase();
  if (
    /no longer available/.test(lower) ||
    /please update your code to use models\//.test(lower) ||
    /no such model/.test(lower) ||
    /model .+ is not (found|supported|available)/.test(lower) ||
    /is not available to (new )?users/.test(lower) ||
    /unknown model/.test(lower) ||
    /invalid model/.test(lower) ||
    /not_found/.test(lower) ||
    /model does not exist/.test(lower)
  ) {
    return true;
  }

  const status = statusCodeOf(err);
  if (status === 404) return true;
  if (status === 400 && /model/.test(lower)) return true;
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;

  return false;
}

export function toClientSafeAiError(err: unknown, notConfiguredMessage?: string): Error {
  const text = errorText(err);
  if (notConfiguredMessage && text === notConfiguredMessage) {
    return err instanceof Error ? err : new Error(text);
  }
  if (text === AI_FAILED_USER_MESSAGE || text === AI_BUSY_USER_MESSAGE) {
    return err instanceof Error ? err : new Error(text);
  }
  if (/quota|rate limit|resource exhausted/i.test(collectedErrorText(err))) {
    return new Error(AI_BUSY_USER_MESSAGE);
  }
  return new Error(AI_FAILED_USER_MESSAGE);
}

export async function runWithModelFallbacks<TModel, TResult>(
  models: TModel[],
  run: (model: TModel, index: number) => Promise<TResult>,
  logUnavailable?: (model: TModel, err: unknown) => void
): Promise<TResult> {
  if (models.length === 0) {
    throw new Error(AI_FAILED_USER_MESSAGE);
  }

  let lastError: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      return await run(models[i], i);
    } catch (err) {
      lastError = err;
      const hasMore = i < models.length - 1;
      if (hasMore && isFallbackWorthyError(err)) {
        logUnavailable?.(models[i], err);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(AI_FAILED_USER_MESSAGE);
}
