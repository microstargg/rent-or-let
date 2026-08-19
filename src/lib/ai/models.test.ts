import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_BUSY_USER_MESSAGE,
  AI_FAILED_USER_MESSAGE,
  GATEWAY_PRIMARY_MODEL,
  GOOGLE_PRIMARY_MODEL,
  errorText,
  gatewayModelChain,
  googleModelChain,
  isFallbackWorthyError,
  runWithModelFallbacks,
  toClientSafeAiError,
} from "./models";

describe("googleModelChain", () => {
  it("defaults to gemini-3.6-flash then older Flash backups", () => {
    const chain = googleModelChain();
    assert.equal(chain[0], GOOGLE_PRIMARY_MODEL);
    assert.equal(chain[0], "gemini-3.6-flash");
    assert.ok(chain.includes("gemini-3.5-flash"));
    assert.ok(chain.includes("gemini-3.5-flash-lite"));
    assert.ok(chain.includes("gemini-flash-latest"));
    assert.ok(!chain.includes("gemini-2.5-flash"));
  });

  it("tries an override first and de-duplicates the default", () => {
    assert.deepEqual(googleModelChain("gemini-3.6-flash")[0], "gemini-3.6-flash");
    assert.equal(googleModelChain("google/gemini-3.5-flash-lite")[0], "gemini-3.5-flash-lite");
    assert.equal(new Set(googleModelChain("gemini-3.6-flash")).size, googleModelChain("gemini-3.6-flash").length);
  });
});

describe("gatewayModelChain", () => {
  it("keeps the Gateway Flash primary and includes 3.6 as backup", () => {
    const chain = gatewayModelChain();
    assert.equal(chain[0], GATEWAY_PRIMARY_MODEL);
    assert.ok(chain.includes("google/gemini-3.6-flash"));
    assert.ok(chain.includes("google/gemini-3.5-flash"));
  });

  it("normalises a bare Google id into a Gateway slug", () => {
    assert.equal(gatewayModelChain("gemini-3.6-flash")[0], "google/gemini-3.6-flash");
  });
});

describe("isFallbackWorthyError", () => {
  it("detects the Google retired-model message shown to new users", () => {
    const err = new Error(
      "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements."
    );
    assert.equal(isFallbackWorthyError(err), true);
  });

  it("treats missing-model HTTP statuses as fallback-worthy", () => {
    assert.equal(isFallbackWorthyError({ statusCode: 404, message: "not found" }), true);
    assert.equal(
      isFallbackWorthyError({ statusCode: 400, message: "models/gemini-2.5-flash is not found" }),
      true
    );
    assert.equal(isFallbackWorthyError({ statusCode: 429, message: "RESOURCE_EXHAUSTED" }), true);
    assert.equal(isFallbackWorthyError({ statusCode: 503, message: "overloaded" }), true);
  });

  it("does not fall back on auth or unrelated validation errors", () => {
    assert.equal(isFallbackWorthyError(new Error("Invalid API key")), false);
    assert.equal(isFallbackWorthyError({ statusCode: 401, message: "unauthorized" }), false);
    assert.equal(isFallbackWorthyError(new Error("No object generated: response did not match schema")), false);
  });
});

describe("toClientSafeAiError", () => {
  it("never forwards the Google model-retirement wording", () => {
    const err = toClientSafeAiError(
      new Error(
        "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements."
      )
    );
    assert.equal(err.message, AI_FAILED_USER_MESSAGE);
    assert.equal(/gemini-2\.5-flash|no longer available/i.test(err.message), false);
  });

  it("maps quota errors to a busy message", () => {
    assert.equal(toClientSafeAiError(new Error("RESOURCE_EXHAUSTED: quota")).message, AI_BUSY_USER_MESSAGE);
  });
});

describe("runWithModelFallbacks", () => {
  it("retries the next model when the first is retired", async () => {
    const attempted: string[] = [];
    const result = await runWithModelFallbacks(["gemini-2.5-flash", "gemini-3.6-flash"], async (model) => {
      attempted.push(model);
      if (model === "gemini-2.5-flash") {
        throw new Error("This model models/gemini-2.5-flash is no longer available to new users.");
      }
      return `ok:${model}`;
    });
    assert.equal(result, "ok:gemini-3.6-flash");
    assert.deepEqual(attempted, ["gemini-2.5-flash", "gemini-3.6-flash"]);
  });

  it("does not retry unrelated failures", async () => {
    const attempted: string[] = [];
    await assert.rejects(
      () =>
        runWithModelFallbacks(["a", "b"], async (model) => {
          attempted.push(model);
          throw new Error("No object generated");
        }),
      (err: unknown) => errorText(err) === "No object generated"
    );
    assert.deepEqual(attempted, ["a"]);
  });

  it("throws the last provider error when every model is retired", async () => {
    await assert.rejects(
      () =>
        runWithModelFallbacks(["a", "b"], async () => {
          throw new Error("This model models/a is no longer available to new users.");
        }),
      /no longer available/
    );
  });
});
