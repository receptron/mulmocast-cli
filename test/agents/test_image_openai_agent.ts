import test, { mock } from "node:test";
import assert from "node:assert";
import { imageOpenaiAgent, buildDeprecatedModelMessage } from "../../src/agents/image_openai_agent.js";
import { gptImageQuality, gptImages, isGptImage25Model, provider2ImageAgent } from "../../src/types/provider2agent.js";
import OpenAI from "openai";
import type { OpenAIImageQuality } from "../../src/types/agent.js";
import { agentCallContext } from "../fixtures.js";

const baseParams = { ...agentCallContext, config: { apiKey: "fake-key-not-used" } };

const canvasSize = { width: 1024, height: 1024 };

test("buildDeprecatedModelMessage returns migration hint for dall-e-2", () => {
  const message = buildDeprecatedModelMessage("dall-e-2");
  assert.ok(message);
  assert.match(message, /dall-e-2.*no longer available/);
  assert.match(message, /gpt-image-2\.5-sunburst/);
});

test("buildDeprecatedModelMessage returns migration hint for dall-e-3", () => {
  const message = buildDeprecatedModelMessage("dall-e-3");
  assert.ok(message);
  assert.match(message, /dall-e-3.*no longer available/);
  assert.match(message, /gpt-image-2\.5-sunburst/);
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
    (err: Error) => /dall-e-2.*no longer available/.test(err.message) && /gpt-image-2\.5-sunburst/.test(err.message),
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
    (err: Error) => /dall-e-3.*no longer available/.test(err.message) && /gpt-image-2\.5-sunburst/.test(err.message),
    "expected upfront deprecation rejection without an API call",
  );
});

test("gptImages: the OpenAI image default and the 2.5 models take the GPT Image path", () => {
  ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", provider2ImageAgent.openai.defaultModel].forEach((model) =>
    assert.ok(gptImages.includes(model), `${model} is not in gptImages`),
  );
});

test("gptImageQuality: the 2.5 models default to high; a set quality and the older models are left alone", () => {
  assert.strictEqual(gptImageQuality("gpt-image-2.5-sunburst"), "high");
  assert.strictEqual(gptImageQuality("gpt-image-2.5-flare", undefined), "high");
  assert.strictEqual(gptImageQuality(provider2ImageAgent.openai.defaultModel), "high");
  assert.strictEqual(gptImageQuality("gpt-image-2.5-sunburst", "low"), "low");
  assert.strictEqual(gptImageQuality("gpt-image-2.5-sunburst", "auto"), "auto");
  ["gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "gpt-image-2"].forEach((model) => assert.strictEqual(gptImageQuality(model), undefined, model));
  assert.strictEqual(gptImageQuality("gpt-image-1", "medium"), "medium");
});

test("isGptImage25Model: the 2.5 models only", () => {
  ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].forEach((model) => assert.strictEqual(isGptImage25Model(model), true, model));
  ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", ""].forEach((model) => assert.strictEqual(isGptImage25Model(model), false, model));
});

const sentImageQuality = async (params: { model: string; quality?: OpenAIImageQuality }) => {
  const sent: (string | null | undefined)[] = [];
  const generate = mock.method(OpenAI.Images.prototype, "generate", async (body: OpenAI.ImageGenerateParams) => {
    sent.push(body.quality);
    throw new Error("request captured");
  });
  try {
    await assert.rejects(
      () => imageOpenaiAgent({ ...baseParams, namedInputs: { prompt: "a cat" }, params: { ...params, canvasSize, moderation: "auto" } }),
      /request captured/,
    );
  } finally {
    generate.mock.restore();
  }
  return sent;
};

test("imageOpenaiAgent sends the resolved quality to the OpenAI request", async () => {
  assert.deepStrictEqual(await sentImageQuality({ model: "gpt-image-2.5-sunburst" }), ["high"]);
  assert.deepStrictEqual(await sentImageQuality({ model: "gpt-image-2.5-flare", quality: "auto" }), ["auto"]);
  assert.deepStrictEqual(await sentImageQuality({ model: "gpt-image-2.5-sunburst", quality: "low" }), ["low"]);
  assert.deepStrictEqual(await sentImageQuality({ model: "gpt-image-1" }), [undefined]);
});
