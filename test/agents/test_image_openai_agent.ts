import test from "node:test";
import assert from "node:assert";
import type { GraphAI } from "graphai";
import { imageOpenaiAgent, buildDeprecatedModelMessage } from "../../src/agents/image_openai_agent.js";

const baseParams = {
  config: { apiKey: "fake-key-not-used" },
  filterParams: {},
  debugInfo: {
    verbose: false,
    nodeId: "",
    state: "",
    retry: 0,
    subGraphs: new Map<string, GraphAI>(),
  },
};

const canvasSize = { width: 1024, height: 1024 };

test("buildDeprecatedModelMessage returns migration hint for dall-e-2", () => {
  const message = buildDeprecatedModelMessage("dall-e-2");
  assert.ok(message);
  assert.match(message, /dall-e-2.*no longer available/);
  assert.match(message, /gpt-image-1/);
});

test("buildDeprecatedModelMessage returns migration hint for dall-e-3", () => {
  const message = buildDeprecatedModelMessage("dall-e-3");
  assert.ok(message);
  assert.match(message, /dall-e-3.*no longer available/);
  assert.match(message, /gpt-image-1/);
});

test("buildDeprecatedModelMessage returns null for currently supported model", () => {
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-1"), null);
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-1-mini"), null);
});

test("buildDeprecatedModelMessage returns null for unknown / future model names", () => {
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-99"), null);
  assert.strictEqual(buildDeprecatedModelMessage("typo-model"), null);
  assert.strictEqual(buildDeprecatedModelMessage(""), null);
});

test("imageOpenaiAgent rejects deprecated dall-e-2 before calling the API", async () => {
  await assert.rejects(
    () =>
      imageOpenaiAgent({
        ...baseParams,
        namedInputs: { prompt: "test prompt", referenceImages: [] },
        params: { model: "dall-e-2", canvasSize, moderation: "auto" },
      }),
    (err: Error) => /dall-e-2.*no longer available/.test(err.message) && /gpt-image-1/.test(err.message),
    "expected upfront deprecation rejection without an API call",
  );
});

test("imageOpenaiAgent rejects deprecated dall-e-3 before calling the API", async () => {
  await assert.rejects(
    () =>
      imageOpenaiAgent({
        ...baseParams,
        namedInputs: { prompt: "test prompt", referenceImages: [] },
        params: { model: "dall-e-3", canvasSize, moderation: "auto" },
      }),
    (err: Error) => /dall-e-3.*no longer available/.test(err.message) && /gpt-image-1/.test(err.message),
    "expected upfront deprecation rejection without an API call",
  );
});
