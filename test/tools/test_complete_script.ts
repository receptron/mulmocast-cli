import test from "node:test";
import assert from "node:assert";
import { addMulmocastVersion, mergeWithTemplate, completeScript } from "../../src/tools/complete_script.js";
import { currentMulmoScriptVersion } from "../../src/types/const.js";
import type { MulmoScript } from "../../src/types/type.js";

test("addMulmocastVersion - adds version when not present", () => {
  const input = { beats: [{ text: "Hello" }] };
  const result = addMulmocastVersion(input);

  assert.deepStrictEqual(result.$mulmocast, { version: currentMulmoScriptVersion });
  assert.deepStrictEqual(result.beats, [{ text: "Hello" }]);
});

test("addMulmocastVersion - preserves existing version", () => {
  const input = { $mulmocast: { version: "1.0" }, beats: [{ text: "Hello" }] };
  const result = addMulmocastVersion(input);

  assert.deepStrictEqual(result.$mulmocast, { version: "1.0" });
});

test("mergeWithTemplate - merges template with input (input takes precedence)", () => {
  const template = {
    title: "Template Title",
    lang: "en",
    imageParams: { provider: "openai", model: "dall-e-3" },
    beats: [],
  } as unknown as MulmoScript;

  const input = {
    title: "My Title",
    imageParams: { model: "gpt-image-1" },
    beats: [{ text: "Hello" }],
  };

  const result = mergeWithTemplate(input, template);

  assert.strictEqual(result.title, "My Title");
  assert.strictEqual(result.lang, "en");
  assert.deepStrictEqual(result.imageParams, { provider: "openai", model: "gpt-image-1" });
  assert.deepStrictEqual(result.beats, [{ text: "Hello" }]);
});

test("mergeWithTemplate - handles missing params in input", () => {
  const template = {
    title: "Template Title",
    speechParams: { speakers: {} },
    beats: [],
  } as unknown as MulmoScript;

  const input = {
    beats: [{ text: "Hello" }],
  };

  const result = mergeWithTemplate(input, template);

  assert.strictEqual(result.title, "Template Title");
  assert.deepStrictEqual(result.speechParams, { speakers: {} });
});

test("completeScript - completes minimal input", () => {
  const input = { beats: [{ text: "Hello" }] };
  const result = completeScript(input);

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.deepStrictEqual(result.data.$mulmocast, { version: currentMulmoScriptVersion });
    assert.strictEqual(result.data.lang, "en");
    assert.strictEqual(result.data.beats.length, 1);
    assert.strictEqual(result.data.beats[0].text, "Hello");
    assert.ok(result.data.canvasSize);
    assert.ok(result.data.speechParams);
    assert.ok(result.data.imageParams);
  }
});

test("completeScript - returns errors for invalid input", () => {
  const input = { beats: [] };
  const result = completeScript(input);

  assert.strictEqual(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.length > 0);
  }
});

test("completeScript - preserves custom values", () => {
  const input = {
    title: "Custom Title",
    lang: "ja",
    beats: [{ text: "Hello", imagePrompt: "A sunset" }],
  };
  const result = completeScript(input);

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.title, "Custom Title");
    assert.strictEqual(result.data.lang, "ja");
    assert.strictEqual(result.data.beats[0].imagePrompt, "A sunset");
  }
});
