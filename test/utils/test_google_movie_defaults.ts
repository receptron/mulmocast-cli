import test from "node:test";
import assert from "node:assert";
import { defaultMovieModel, provider2MovieAgent, vertexAIGlobalOnlyImageModels, vertexImageLocation } from "../../src/types/provider2agent.js";

test("defaultMovieModel: Vertex AI gets the GA Veo name, the Gemini API Gemini Omni", () => {
  assert.strictEqual(defaultMovieModel("google"), "gemini-omni-1.1-flash");
  assert.strictEqual(defaultMovieModel("google"), provider2MovieAgent.google.defaultModel);
  assert.strictEqual(defaultMovieModel("google", {}), provider2MovieAgent.google.defaultModel);
  assert.strictEqual(defaultMovieModel("google", { vertexai_project: "p" }), "veo-3.1-generate-001");
  assert.strictEqual(defaultMovieModel("replicate", { vertexai_project: "p" }), provider2MovieAgent.replicate.defaultModel);
  assert.ok(provider2MovieAgent.google.modelParams["veo-3.1-generate-001"], "the Vertex default has model params");
});

test("google movie models: the Veo 3.1 previews (shut down 2026-10-22) are gone, with no price left behind", () => {
  ["veo-3.1-generate-preview", "veo-3.1-lite-generate-preview"].forEach((model) => {
    assert.strictEqual(provider2MovieAgent.google.models.includes(model), false, model);
    assert.strictEqual(model in provider2MovieAgent.google.modelParams, false, model);
  });
  provider2MovieAgent.google.models.forEach((model) => assert.ok(provider2MovieAgent.google.modelParams[model], `${model} has model params`));
});

test("vertexAIGlobalOnlyImageModels: the GA Lite and Pro image models are global-only; 3.1 Flash Image is not", () => {
  ["gemini-3.1-flash-lite-image", "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"].forEach((model) =>
    assert.ok(vertexAIGlobalOnlyImageModels.has(model), model),
  );
  assert.strictEqual(vertexAIGlobalOnlyImageModels.has("gemini-3.1-flash-image"), false);
});

test("vertexImageLocation: an omitted location is global for a global-only model and us-central1 otherwise; an explicit one is kept", () => {
  assert.strictEqual(vertexImageLocation("gemini-3.1-flash-lite-image"), "global");
  assert.strictEqual(vertexImageLocation("gemini-3-pro-image", undefined), "global");
  assert.strictEqual(vertexImageLocation("gemini-3.1-flash-image"), "us-central1");
  assert.strictEqual(vertexImageLocation("gemini-2.5-flash-image"), "us-central1");
  assert.strictEqual(vertexImageLocation("gemini-3.1-flash-lite-image", "us-central1"), "us-central1");
  assert.strictEqual(vertexImageLocation("gemini-3.1-flash-image", "eu"), "eu");
});
