import test from "node:test";
import assert from "node:assert";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import { provider2MovieAgent } from "../../src/types/provider2agent.js";

// Test: generateAudio schema validation
test("generateAudio: true is valid in movieParams", () => {
  const script = {
    $mulmocast: { version: "1.1" },
    lang: "en",
    beats: [
      {
        text: "test",
        moviePrompt: "A cat walking",
        movieParams: { generateAudio: true },
      },
    ],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, true);
});

test("generateAudio: false is valid in movieParams", () => {
  const script = {
    $mulmocast: { version: "1.1" },
    lang: "en",
    beats: [
      {
        text: "test",
        moviePrompt: "A cat walking",
        movieParams: { generateAudio: false },
      },
    ],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, false);
});

test("generateAudio omitted is valid (defaults to undefined)", () => {
  const script = {
    $mulmocast: { version: "1.1" },
    lang: "en",
    beats: [
      {
        text: "test",
        moviePrompt: "A cat walking",
        movieParams: { model: "kwaivgi/kling-v3-video" },
      },
    ],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, undefined);
});

test("generateAudio: string is invalid", () => {
  const script = {
    $mulmocast: { version: "1.1" },
    lang: "en",
    beats: [
      {
        text: "test",
        moviePrompt: "A cat walking",
        movieParams: { generateAudio: "yes" },
      },
    ],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(!result.success);
});

// Test: provider2agent audio metadata
test("kling-v3-video has optional audio with generate_audio param", () => {
  const params = provider2MovieAgent.replicate.modelParams["kwaivgi/kling-v3-video"];
  assert.ok(params);
  assert.ok(params.audio);
  assert.strictEqual(params.audio.mode, "optional");
  if (params.audio.mode === "optional") {
    assert.strictEqual(params.audio.param, "generate_audio");
  }
});

test("kling-v3-omni-video has optional audio with generate_audio param", () => {
  const params = provider2MovieAgent.replicate.modelParams["kwaivgi/kling-v3-omni-video"];
  assert.ok(params);
  assert.ok(params.audio);
  assert.strictEqual(params.audio.mode, "optional");
  if (params.audio.mode === "optional") {
    assert.strictEqual(params.audio.param, "generate_audio");
  }
});

test("veo-3 (replicate) has optional audio with generate_audio param", () => {
  const params = provider2MovieAgent.replicate.modelParams["google/veo-3"];
  assert.ok(params);
  assert.ok(params.audio);
  assert.strictEqual(params.audio.mode, "optional");
  if (params.audio.mode === "optional") {
    assert.strictEqual(params.audio.param, "generate_audio");
  }
});

test("seedance-2.0 has optional audio with generate_audio param", () => {
  const params = provider2MovieAgent.replicate.modelParams["bytedance/seedance-2.0"];
  assert.ok(params);
  assert.ok(params.audio);
  assert.strictEqual(params.audio.mode, "optional");
  if (params.audio.mode === "optional") {
    assert.strictEqual(params.audio.param, "generate_audio");
  }
});

test("pixverse-v4.5 has optional audio with sound_effect_switch param", () => {
  const params = provider2MovieAgent.replicate.modelParams["pixverse/pixverse-v4.5"];
  assert.ok(params);
  assert.ok(params.audio);
  assert.strictEqual(params.audio.mode, "optional");
  if (params.audio.mode === "optional") {
    assert.strictEqual(params.audio.param, "sound_effect_switch");
  }
});

test("seedance-1-lite has never audio", () => {
  const params = provider2MovieAgent.replicate.modelParams["bytedance/seedance-1-lite"];
  assert.ok(params);
  assert.strictEqual(params.audio.mode, "never");
});

test("veo-2 (replicate) has never audio", () => {
  const params = provider2MovieAgent.replicate.modelParams["google/veo-2"];
  assert.ok(params);
  assert.strictEqual(params.audio.mode, "never");
});

test("google genai veo-3.1 has always audio", () => {
  const params = provider2MovieAgent.google.modelParams["veo-3.1-generate-preview"];
  assert.ok(params);
  assert.strictEqual(params.audio.mode, "always");
});

test("google genai veo-2.0 has never audio", () => {
  const params = provider2MovieAgent.google.modelParams["veo-2.0-generate-001"];
  assert.ok(params);
  assert.strictEqual(params.audio.mode, "never");
});
