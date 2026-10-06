import test from "node:test";
import assert from "node:assert";
import { imageGenAIAgent, buildDeprecatedGoogleImageModelMessage } from "../../src/agents/image_genai_agent.js";
import { isGeminiImageModel, provider2ImageAgent } from "../../src/types/provider2agent.js";
import { agentCallContext } from "../fixtures.js";

const baseParams = { ...agentCallContext, config: { apiKey: "fake-key-not-used" } };

const canvasSize = { width: 1024, height: 1024 };

test("buildDeprecatedGoogleImageModelMessage returns hint for imagen-3.0-generate-002", () => {
  const message = buildDeprecatedGoogleImageModelMessage("imagen-3.0-generate-002");
  assert.ok(message);
  assert.match(message, /imagen-3\.0-generate-002.*no longer available/);
  assert.match(message, /gemini-3\.1-flash-lite-image|gemini-3-pro-image/);
});

test("buildDeprecatedGoogleImageModelMessage returns hint for all imagen-4 GA variants", () => {
  for (const model of ["imagen-4.0-generate-001", "imagen-4.0-ultra-generate-001", "imagen-4.0-fast-generate-001"]) {
    const message = buildDeprecatedGoogleImageModelMessage(model);
    assert.ok(message, `expected hint for ${model}`);
    assert.ok(message.includes(model), `expected message to contain "${model}", got "${message}"`);
    assert.ok(message.includes("no longer available"), `expected "no longer available" phrase in "${message}"`);
  }
});

test("buildDeprecatedGoogleImageModelMessage returns hint for already-shut-down preview variants", () => {
  for (const model of ["imagen-4.0-generate-preview-06-06", "imagen-4.0-ultra-generate-preview-06-06"]) {
    const message = buildDeprecatedGoogleImageModelMessage(model);
    assert.ok(message, `expected hint for ${model}`);
  }
});

test("buildDeprecatedGoogleImageModelMessage returns null for currently supported Gemini image models", () => {
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage("gemini-2.5-flash-image"), null);
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage("gemini-3-pro-image-preview"), null);
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage("gemini-3.1-flash-image-preview"), null);
});

test("buildDeprecatedGoogleImageModelMessage returns null for unknown / future model names", () => {
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage("imagen-5.0-generate-001"), null);
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage("typo-model"), null);
  assert.strictEqual(buildDeprecatedGoogleImageModelMessage(""), null);
});

test("imageGenAIAgent rejects deprecated imagen-4.0-generate-001 before calling the API", async () => {
  await assert.rejects(
    () =>
      imageGenAIAgent({
        ...baseParams,
        namedInputs: { prompt: "test prompt", referenceImages: [] },
        params: { model: "imagen-4.0-generate-001", canvasSize },
      }),
    (err: Error) => /imagen-4\.0-generate-001.*no longer available/.test(err.message),
    "expected upfront deprecation rejection without an API call",
  );
});

test("imageGenAIAgent rejects deprecated imagen-3.0-generate-002 before calling the API", async () => {
  await assert.rejects(
    () =>
      imageGenAIAgent({
        ...baseParams,
        namedInputs: { prompt: "test prompt", referenceImages: [] },
        params: { model: "imagen-3.0-generate-002", canvasSize },
      }),
    (err: Error) => /imagen-3\.0-generate-002.*no longer available/.test(err.message),
    "expected upfront deprecation rejection without an API call",
  );
});

test("isGeminiImageModel: every Gemini image model the provider lists goes through generateContent", () => {
  provider2ImageAgent.google.models.forEach((model) => assert.strictEqual(isGeminiImageModel(model), true, model));
  ["imagen-4.0-generate-001", "imagen-3.0-generate-002", "nano-banana-pro-preview", ""].forEach((model) =>
    assert.strictEqual(isGeminiImageModel(model), false, model),
  );
});
