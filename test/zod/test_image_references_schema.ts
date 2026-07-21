import test from "node:test";
import assert from "node:assert";
import { mulmoImagePromptMediaSchema, mulmoImageParamsImagesSchema } from "../../src/types/schema.js";

test("imagePrompt accepts a references array with name/source/label entries", () => {
  const result = mulmoImagePromptMediaSchema.safeParse({
    type: "imagePrompt",
    prompt: "Travis stands in the charred clearing at dusk",
    references: [
      { name: "portrait_travis_kane", label: "the firefighter Travis Kane" },
      { name: "portrait_hexapod_probe" },
      { source: { kind: "path", path: "./refs/ship.png" }, label: "the capsule-shaped black spacecraft" },
    ],
  });
  assert.ok(result.success);
});

test("imagePrompt legacy referenceImageName/referenceImage remain valid", () => {
  const result = mulmoImagePromptMediaSchema.safeParse({
    type: "imagePrompt",
    prompt: "a scene",
    referenceImageName: "portrait",
    referenceImage: { kind: "path", path: "./legacy.png" },
  });
  assert.ok(result.success);
});

test("a reference entry must have exactly one of name or source", () => {
  const both = mulmoImagePromptMediaSchema.safeParse({
    type: "imagePrompt",
    prompt: "a scene",
    references: [{ name: "portrait", source: { kind: "path", path: "./a.png" } }],
  });
  assert.strictEqual(both.success, false);

  const neither = mulmoImagePromptMediaSchema.safeParse({
    type: "imagePrompt",
    prompt: "a scene",
    references: [{ label: "an unbound label" }],
  });
  assert.strictEqual(neither.success, false);
});

test("imageParams.images keys reject the reserved $ prefix", () => {
  const image = { type: "image", source: { kind: "path", path: "./a.png" } };
  assert.ok(mulmoImageParamsImagesSchema.safeParse({ scene_01: image }).success);
  assert.strictEqual(mulmoImageParamsImagesSchema.safeParse({ $beatImage: image }).success, false);
  assert.strictEqual(mulmoImageParamsImagesSchema.safeParse({ $anything: image }).success, false);
});
