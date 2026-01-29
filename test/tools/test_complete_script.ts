import test from "node:test";
import assert from "node:assert";
import { addMulmocastVersion, mergeScripts, completeScript, styleExists } from "../../src/tools/complete_script.js";
import { currentMulmoScriptVersion } from "../../src/types/const.js";

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

test("mergeScripts - merges base with override (override takes precedence)", () => {
  const base = {
    title: "Base Title",
    lang: "en",
    imageParams: { provider: "openai", model: "dall-e-3" },
    beats: [],
  };

  const override = {
    title: "My Title",
    imageParams: { model: "gpt-image-1" },
    beats: [{ text: "Hello" }],
  };

  const result = mergeScripts(base, override);

  assert.strictEqual(result.title, "My Title");
  assert.strictEqual(result.lang, "en");
  assert.deepStrictEqual(result.imageParams, { provider: "openai", model: "gpt-image-1" });
  assert.deepStrictEqual(result.beats, [{ text: "Hello" }]);
});

test("mergeScripts - handles missing params in override", () => {
  const base = {
    title: "Base Title",
    speechParams: { speakers: {} },
    beats: [],
  };

  const override = {
    beats: [{ text: "Hello" }],
  };

  const result = mergeScripts(base, override);

  assert.strictEqual(result.title, "Base Title");
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

test("styleExists - returns true for existing style", () => {
  assert.strictEqual(styleExists("ani"), true);
});

test("styleExists - returns false for non-existing style", () => {
  assert.strictEqual(styleExists("nonexistent"), false);
});

test("completeScript - applies style by name", () => {
  const input = { beats: [{ text: "Hello" }] };
  const result = completeScript(input, { styleName: "ani" });

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.canvasSize?.width, 1024);
    assert.strictEqual(result.data.canvasSize?.height, 1536);
  }
});

test("completeScript - applies style from file path", () => {
  const input = { beats: [{ text: "Hello" }] };
  const result = completeScript(input, { styleName: "./assets/styles/ani.json" });

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.canvasSize?.width, 1024);
    assert.strictEqual(result.data.canvasSize?.height, 1536);
  }
});

test("styleExists - returns true for file path", () => {
  assert.strictEqual(styleExists("./assets/styles/ani.json"), true);
});

test("styleExists - returns false for non-existing file", () => {
  assert.strictEqual(styleExists("./nonexistent.json"), false);
});

test("completeScript - throws error when both templateName and styleName are specified", () => {
  const input = { beats: [{ text: "Hello" }] };

  assert.throws(() => completeScript(input, { templateName: "children_book", styleName: "ani" }), {
    message: "Cannot specify both templateName and styleName. They are mutually exclusive.",
  });
});
