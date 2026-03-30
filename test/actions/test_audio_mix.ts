import test from "node:test";
import assert from "node:assert";

import { isExplicitMixMode, mixAudiosFromMovieBeats, resolveMovieVolume } from "../../src/actions/movie.js";
import { FfmpegContextInit } from "../../src/utils/ffmpeg_utils.js";
import { createMockContext } from "./utils.js";
import { MulmoStudioContext, MulmoBeat } from "../../src/types/index.js";

const createContextWithAudioParams = (audioParamsOverrides: Record<string, unknown> = {}): MulmoStudioContext => {
  const context = createMockContext();
  context.presentationStyle.audioParams = {
    padding: 0.3,
    introPadding: 1.0,
    closingPadding: 0.8,
    outroPadding: 1.0,
    bgmVolume: 0.2,
    audioVolume: 1.0,
    suppressSpeech: false,
    ...audioParamsOverrides,
  };
  return context;
};

// --- isExplicitMixMode ---

test("isExplicitMixMode: returns false when no new params are set", () => {
  const context = createContextWithAudioParams();
  assert.strictEqual(isExplicitMixMode(context), false);
});

test("isExplicitMixMode: returns true when movieVolume is set", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.3 });
  assert.strictEqual(isExplicitMixMode(context), true);
});

test("isExplicitMixMode: returns true when ttsVolume is set", () => {
  const context = createContextWithAudioParams({ ttsVolume: 0.8 });
  assert.strictEqual(isExplicitMixMode(context), true);
});

test("isExplicitMixMode: returns true when ducking is true", () => {
  const context = createContextWithAudioParams({ ducking: true });
  assert.strictEqual(isExplicitMixMode(context), true);
});

test("isExplicitMixMode: returns false when ducking is false", () => {
  const context = createContextWithAudioParams({ ducking: false });
  assert.strictEqual(isExplicitMixMode(context), false);
});

test("isExplicitMixMode: returns false when ducking is true but suppressSpeech is true", () => {
  const context = createContextWithAudioParams({ ducking: true, suppressSpeech: true });
  assert.strictEqual(isExplicitMixMode(context), false);
});

// --- mixAudiosFromMovieBeats: legacy mode ---

test("mixAudiosFromMovieBeats: legacy mode - no movie audio returns artifactAudioId", () => {
  const context = createContextWithAudioParams();
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", [], context);
  assert.strictEqual(result, "0:a");
  assert.strictEqual(ffmpegContext.filterComplex.length, 0);
});

test("mixAudiosFromMovieBeats: legacy mode - uses amix without normalize=0", () => {
  const context = createContextWithAudioParams();
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);
  assert.strictEqual(result, "[composite]");

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("amix=inputs=3:duration=first:dropout_transition=2"), "should use amix with 3 inputs");
  assert.ok(!filterStr.includes("normalize=0"), "should NOT include normalize=0");
  assert.ok(!filterStr.includes("alimiter"), "should NOT include alimiter");
});

// --- mixAudiosFromMovieBeats: manual mode ---

test("mixAudiosFromMovieBeats: manual mode - uses normalize=0 and alimiter", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.3 });
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);
  assert.strictEqual(result, "[composite]");

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("normalize=0"), "should include normalize=0");
  assert.ok(filterStr.includes("alimiter"), "should include alimiter");
  assert.ok(!filterStr.includes("sidechaincompress"), "should NOT include sidechaincompress");
});

test("mixAudiosFromMovieBeats: manual mode - applies ttsVolume", () => {
  const context = createContextWithAudioParams({ ttsVolume: 0.7 });
  const ffmpegContext = FfmpegContextInit();
  mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1"], context);

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("volume=0.7"), "should apply ttsVolume=0.7");
});

// --- mixAudiosFromMovieBeats: ducking mode ---
// Ducking is implemented at beat level (movieVolume adjusted per beat in createVideo),
// so mixAudiosFromMovieBeats uses the same explicit mode (normalize=0 + alimiter).

test("mixAudiosFromMovieBeats: ducking mode - uses normalize=0 and alimiter (same as explicit mode)", () => {
  const context = createContextWithAudioParams({ ducking: true });
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);
  assert.strictEqual(result, "[composite]");

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("normalize=0"), "should include normalize=0");
  assert.ok(filterStr.includes("alimiter"), "should include alimiter");
  assert.ok(!filterStr.includes("sidechaincompress"), "should NOT include sidechaincompress");
});

// --- resolveMovieVolume ---

const beatWithText: MulmoBeat = { speaker: "Presenter", text: "Hello" };
const beatWithoutText: MulmoBeat = { speaker: "Presenter" };

test("resolveMovieVolume: no ducking, no movieVolume - returns 1.0", () => {
  const context = createContextWithAudioParams();
  assert.strictEqual(resolveMovieVolume(beatWithText, context), 1.0);
});

test("resolveMovieVolume: script-level movieVolume - returns script value", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.5 });
  assert.strictEqual(resolveMovieVolume(beatWithText, context), 0.5);
});

test("resolveMovieVolume: beat-level movieVolume overrides script-level", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.5 });
  const beat: MulmoBeat = { speaker: "Presenter", text: "Hello", audioParams: { movieVolume: 0.8 } };
  assert.strictEqual(resolveMovieVolume(beat, context), 0.8);
});

test("resolveMovieVolume: ducking with TTS - applies default duckingRatio 0.3", () => {
  const context = createContextWithAudioParams({ ducking: true });
  const result = resolveMovieVolume(beatWithText, context);
  assert.strictEqual(result, 1.0 * 0.3);
});

test("resolveMovieVolume: ducking without TTS - returns full volume", () => {
  const context = createContextWithAudioParams({ ducking: true });
  assert.strictEqual(resolveMovieVolume(beatWithoutText, context), 1.0);
});

test("resolveMovieVolume: ducking with custom duckingRatio", () => {
  const context = createContextWithAudioParams({ ducking: true, duckingRatio: 0.5 });
  const result = resolveMovieVolume(beatWithText, context);
  assert.strictEqual(result, 1.0 * 0.5);
});

test("resolveMovieVolume: ducking with movieVolume and custom duckingRatio", () => {
  const context = createContextWithAudioParams({ ducking: true, movieVolume: 0.4, duckingRatio: 0.5 });
  const result = resolveMovieVolume(beatWithText, context);
  assert.strictEqual(result, 0.4 * 0.5);
});

test("resolveMovieVolume: ducking with beat-level movieVolume override", () => {
  const context = createContextWithAudioParams({ ducking: true, movieVolume: 0.4 });
  const beat: MulmoBeat = { speaker: "Presenter", text: "Hello", audioParams: { movieVolume: 0.8 } };
  const result = resolveMovieVolume(beat, context);
  assert.strictEqual(result, 0.8 * 0.3);
});

test("resolveMovieVolume: ducking + suppressSpeech - no ducking applied", () => {
  const context = createContextWithAudioParams({ ducking: true, suppressSpeech: true });
  const result = resolveMovieVolume(beatWithText, context);
  assert.strictEqual(result, 1.0, "should return full volume because speech is suppressed");
});
