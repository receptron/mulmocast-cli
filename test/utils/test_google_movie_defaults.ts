import test from "node:test";
import assert from "node:assert";
import {
  defaultMovieModel,
  provider2MovieAgent,
  vertexAIGlobalOnlyImageModels,
  veoExtendedSeconds,
  veoExtensionCount,
  VEO_EXTENSION_MODEL,
} from "../../src/types/provider2agent.js";

test("defaultMovieModel: Vertex AI gets the GA Veo name, the Gemini API the shared default", () => {
  assert.strictEqual(defaultMovieModel("google"), provider2MovieAgent.google.defaultModel);
  assert.strictEqual(defaultMovieModel("google", {}), provider2MovieAgent.google.defaultModel);
  assert.strictEqual(defaultMovieModel("google", { vertexai_project: "p" }), "veo-3.1-generate-001");
  assert.strictEqual(defaultMovieModel("replicate", { vertexai_project: "p" }), provider2MovieAgent.replicate.defaultModel);
  assert.ok(provider2MovieAgent.google.modelParams["veo-3.1-generate-001"], "the Vertex default has model params");
});

test("veoExtendedSeconds: an 8-second first segment, then 8 seconds per extension", () => {
  assert.deepStrictEqual(
    [9, 15, 16, 17, 24, 25].map((sec) => [sec, veoExtensionCount(sec), veoExtendedSeconds(sec)]),
    [
      [9, 1, 16],
      [15, 1, 16],
      [16, 1, 16],
      [17, 2, 24],
      [24, 2, 24],
      [25, 3, 32],
    ],
  );
  assert.strictEqual(VEO_EXTENSION_MODEL, provider2MovieAgent.google.defaultModel);
});

test("vertexAIGlobalOnlyImageModels: the GA Lite and Pro image models are global-only; 3.1 Flash Image is not", () => {
  ["gemini-3.1-flash-lite-image", "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"].forEach((model) =>
    assert.ok(vertexAIGlobalOnlyImageModels.has(model), model),
  );
  assert.strictEqual(vertexAIGlobalOnlyImageModels.has("gemini-3.1-flash-image"), false);
});
