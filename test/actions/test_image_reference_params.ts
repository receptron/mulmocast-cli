import test from "node:test";
import assert from "node:assert";
import { referenceImageGraphParams, referenceMovieGraphParams } from "../../src/actions/image_references.js";
import { MulmoPresentationStyleMethods } from "../../src/methods/index.js";
import { createMockContext } from "./utils.js";

const canvasSize = { width: 1280, height: 720 };
const vertex = { vertexai_project: "my-project", vertexai_location: "global" };

test("referenceImageGraphParams: a generated reference image goes to the same Vertex AI target as the beats", () => {
  const { presentationStyle } = createMockContext();
  const info = MulmoPresentationStyleMethods.getImageAgentInfo({ ...presentationStyle, imageParams: { provider: "google", ...vertex } });
  assert.deepStrictEqual(referenceImageGraphParams(info, canvasSize), {
    model: info.imageParams.model,
    moderation: undefined,
    canvasSize,
    quality: undefined,
    ...vertex,
  });
});

test("referenceImageGraphParams: a reference image keeps the quality and moderation the beats get", () => {
  const { presentationStyle } = createMockContext();
  ["low", "auto", "high"].forEach((quality) => {
    const imageParams = { provider: "openai", model: "gpt-image-2.5-sunburst", quality, moderation: "low" };
    const params = referenceImageGraphParams(MulmoPresentationStyleMethods.getImageAgentInfo({ ...presentationStyle, imageParams }), canvasSize);
    assert.strictEqual(params.quality, quality);
    assert.strictEqual(params.moderation, "low");
  });
});

test("referenceMovieGraphParams: a generated reference movie goes to the same Vertex AI target as the beats", () => {
  const { presentationStyle } = createMockContext();
  const info = MulmoPresentationStyleMethods.getMovieAgentInfo({ ...presentationStyle, movieParams: { provider: "google", ...vertex } });
  const params = referenceMovieGraphParams(info, canvasSize);
  assert.strictEqual(params.vertexai_project, "my-project");
  assert.strictEqual(params.vertexai_location, "global");
  assert.strictEqual(params.canvasSize, canvasSize);
});
