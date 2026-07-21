import test from "node:test";
import assert from "node:assert";
import { MulmoImagePromptMediaMethods } from "../../src/methods/mulmo_image_prompt_media.js";
import type { MulmoImagePromptMedia } from "../../src/types/index.js";

const imagePrompt = (overrides: Partial<MulmoImagePromptMedia> = {}): MulmoImagePromptMedia => ({
  type: "imagePrompt",
  prompt: "a test prompt",
  ...overrides,
});

test("getReferences returns an empty list when no references are given", () => {
  assert.deepStrictEqual(MulmoImagePromptMediaMethods.getReferences(imagePrompt()), []);
});

test("getReferences normalizes legacy fields ahead of the references array", () => {
  const image = imagePrompt({
    referenceImageName: "portrait",
    references: [
      { name: "robot", label: "the robot" },
      { source: { kind: "path", path: "./ship.png" }, label: "the ship" },
    ],
  });
  const refs = MulmoImagePromptMediaMethods.getReferences(image);
  assert.deepStrictEqual(refs, [
    { name: "portrait", legacy: true },
    { name: "robot", label: "the robot" },
    { source: { kind: "path", path: "./ship.png" }, label: "the ship" },
  ]);
});

test("getReferences normalizes a legacy referenceImage source", () => {
  const image = imagePrompt({ referenceImage: { kind: "path", path: "./legacy.png" } });
  assert.deepStrictEqual(MulmoImagePromptMediaMethods.getReferences(image), [{ source: { kind: "path", path: "./legacy.png" }, legacy: true }]);
});

test("getReferences ignores referenceImage when referenceImageName is set (legacy behavior)", () => {
  const image = imagePrompt({
    referenceImageName: "portrait",
    referenceImage: { kind: "path", path: "./legacy.png" },
  });
  assert.deepStrictEqual(MulmoImagePromptMediaMethods.getReferences(image), [{ name: "portrait", legacy: true }]);
});

test("hasNamedReference reflects both legacy and array references", () => {
  assert.strictEqual(MulmoImagePromptMediaMethods.hasNamedReference(imagePrompt()), false);
  assert.strictEqual(MulmoImagePromptMediaMethods.hasNamedReference(imagePrompt({ referenceImageName: "portrait" })), true);
  assert.strictEqual(MulmoImagePromptMediaMethods.hasNamedReference(imagePrompt({ referenceImage: { kind: "path", path: "./a.png" } })), false);
  assert.strictEqual(MulmoImagePromptMediaMethods.hasNamedReference(imagePrompt({ references: [{ source: { kind: "path", path: "./a.png" } }] })), false);
  assert.strictEqual(MulmoImagePromptMediaMethods.hasNamedReference(imagePrompt({ references: [{ name: "robot" }] })), true);
});

test("buildReferencePreamble is empty when no reference has a label", () => {
  assert.strictEqual(MulmoImagePromptMediaMethods.buildReferencePreamble([]), "");
  assert.strictEqual(MulmoImagePromptMediaMethods.buildReferencePreamble([undefined, undefined]), "");
});

test("buildReferencePreamble numbers references by position, skipping unlabeled ones", () => {
  const preamble = MulmoImagePromptMediaMethods.buildReferencePreamble(["the firefighter Travis Kane", undefined, "the capsule-shaped black spacecraft"]);
  assert.strictEqual(
    preamble,
    "Reference image 1 shows the firefighter Travis Kane. Reference image 3 shows the capsule-shaped black spacecraft. Use these exact designs.\n",
  );
});
