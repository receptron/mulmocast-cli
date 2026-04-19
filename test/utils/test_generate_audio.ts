import test from "node:test";
import assert from "node:assert";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import { provider2MovieAgent, AUDIO_MODE_NEVER, AUDIO_MODE_ALWAYS, AUDIO_MODE_OPTIONAL } from "../../src/types/provider2agent.js";
import { currentMulmoScriptVersion } from "../../src/types/const.js";
import { movieGenAIAgent } from "../../src/agents/movie_genai_agent.js";
import { movieReplicateAgent } from "../../src/agents/movie_replicate_agent.js";
import { apiErrorType, hasCause, imageAction, unsupportedModelTarget } from "../../src/utils/error_cause.js";

// Test: generateAudio schema validation
test("generateAudio: true is valid in movieParams", () => {
  const script = {
    $mulmocast: { version: currentMulmoScriptVersion },
    lang: "en",
    beats: [{ text: "test", moviePrompt: "A cat walking", movieParams: { generateAudio: true } }],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, true);
});

test("generateAudio: false is valid in movieParams", () => {
  const script = {
    $mulmocast: { version: currentMulmoScriptVersion },
    lang: "en",
    beats: [{ text: "test", moviePrompt: "A cat walking", movieParams: { generateAudio: false } }],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, false);
});

test("generateAudio omitted is valid (defaults to undefined)", () => {
  const script = {
    $mulmocast: { version: currentMulmoScriptVersion },
    lang: "en",
    beats: [{ text: "test", moviePrompt: "A cat walking", movieParams: { model: "kwaivgi/kling-v3-video" } }],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(result.success, `Schema validation failed: ${result.error?.message}`);
  assert.strictEqual(result.data?.beats[0].movieParams?.generateAudio, undefined);
});

test("generateAudio: string is invalid", () => {
  const script = {
    $mulmocast: { version: currentMulmoScriptVersion },
    lang: "en",
    beats: [{ text: "test", moviePrompt: "A cat walking", movieParams: { generateAudio: "yes" } }],
  };
  const result = mulmoScriptSchema.safeParse(script);
  assert.ok(!result.success);
});

// Test: provider2agent audio metadata (table-driven)
const replicateAudioTests: { model: string; mode: string; param?: string }[] = [
  { model: "kwaivgi/kling-v3-video", mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
  { model: "kwaivgi/kling-v3-omni-video", mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
  { model: "google/veo-3", mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
  { model: "bytedance/seedance-2.0", mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
  { model: "pixverse/pixverse-v4.5", mode: AUDIO_MODE_OPTIONAL, param: "sound_effect_switch" },
  { model: "bytedance/seedance-1-lite", mode: AUDIO_MODE_NEVER },
  { model: "google/veo-2", mode: AUDIO_MODE_NEVER },
];

for (const { model, mode, param } of replicateAudioTests) {
  const label = param ? `mode=${mode} param=${param}` : `mode=${mode}`;
  test(`replicate ${model} has audio ${label}`, () => {
    const params = provider2MovieAgent.replicate.modelParams[model];
    assert.ok(params, `Model ${model} not found in modelParams`);
    assert.strictEqual(params.audio.mode, mode);
    if (params.audio.mode === AUDIO_MODE_OPTIONAL) {
      assert.strictEqual(params.audio.param, param);
    }
  });
}

const googleAudioTests: { model: string; mode: string }[] = [
  { model: "veo-3.1-generate-preview", mode: AUDIO_MODE_ALWAYS },
  { model: "veo-2.0-generate-001", mode: AUDIO_MODE_NEVER },
];

for (const { model, mode } of googleAudioTests) {
  test(`google genai ${model} has audio mode=${mode}`, () => {
    const params = provider2MovieAgent.google.modelParams[model];
    assert.ok(params, `Model ${model} not found in modelParams`);
    assert.strictEqual(params.audio.mode, mode);
  });
}

// Test: agent rejection for unsupported generateAudio
test("movieGenAIAgent rejects generateAudio=true for never-audio model", async () => {
  await assert.rejects(
    () =>
      movieGenAIAgent({
        namedInputs: {
          prompt: "A calm ocean at sunset",
          movieFile: "output/test/test_genai_audio.mp4",
        },
        params: {
          model: "veo-2.0-generate-001",
          canvasSize: { width: 1280, height: 720 },
          generateAudio: true,
        },
        config: {},
      }),
    (err: Error) => {
      assert.match(err.message, /does not support audio generation/);
      assert.ok(hasCause(err), "error should include cause");
      assert.deepStrictEqual(err.cause, {
        type: apiErrorType,
        action: imageAction,
        target: unsupportedModelTarget,
        agentName: "movieGenAIAgent",
      });
      return true;
    },
  );
});

test("movieReplicateAgent rejects generateAudio=true for never-audio model", async () => {
  await assert.rejects(
    () =>
      movieReplicateAgent({
        namedInputs: {
          prompt: "A calm ocean at sunset",
          movieFile: "output/test/test_replicate_audio.mp4",
        },
        params: {
          model: "bytedance/seedance-1-lite",
          canvasSize: { width: 1280, height: 720 },
          generateAudio: true,
        },
        config: { apiKey: "dummy-key" },
      }),
    (err: Error) => {
      assert.match(err.message, /does not support audio generation/);
      assert.ok(hasCause(err), "error should include cause");
      assert.deepStrictEqual(err.cause, {
        type: apiErrorType,
        action: imageAction,
        target: unsupportedModelTarget,
        agentName: "movieReplicateAgent",
      });
      return true;
    },
  );
});
