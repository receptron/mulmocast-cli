import test from "node:test";
import assert from "node:assert";

import { isExplicitMixMode, mixAudiosFromMovieBeats } from "../../src/actions/movie.js";
import { FfmpegContextInit } from "../../src/utils/ffmpeg_utils.js";
import { createMockContext } from "./utils.js";
import { MulmoStudioContext } from "../../src/types/index.js";

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

test("isExplicitMixMode: returns true when ducking is set", () => {
  const context = createContextWithAudioParams({ ducking: {} });
  assert.strictEqual(isExplicitMixMode(context), true);
});

test("isExplicitMixMode: returns true when ducking has custom ratio", () => {
  const context = createContextWithAudioParams({ ducking: { ratio: 0.5 } });
  assert.strictEqual(isExplicitMixMode(context), true);
});

test("isExplicitMixMode: returns false when ducking is set but suppressSpeech is true", () => {
  const context = createContextWithAudioParams({ ducking: {}, suppressSpeech: true });
  assert.strictEqual(isExplicitMixMode(context), false);
});

test("isExplicitMixMode: returns true when only beat-level movieVolume is set", () => {
  const context = createContextWithAudioParams();
  context.studio.script.beats = [{ speaker: "Presenter", audioParams: { movieVolume: 0.5 } }];
  assert.strictEqual(isExplicitMixMode(context), true);
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

test("mixAudiosFromMovieBeats: legacy mode - filterComplex matches pre-PR format exactly", () => {
  const context = createContextWithAudioParams();
  const ffmpegContext = FfmpegContextInit();
  mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2", "a3"], context);

  // This is the exact filterComplex that the pre-PR code would produce
  assert.deepStrictEqual(ffmpegContext.filterComplex, [
    "[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[mainaudio]",
    "[mainaudio][a1][a2][a3]amix=inputs=4:duration=first:dropout_transition=2[composite]",
  ]);
});

// --- mixAudiosFromMovieBeats: explicit mode ---

test("mixAudiosFromMovieBeats: explicit mode - uses normalize=0 and alimiter", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.3 });
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);
  assert.strictEqual(result, "[composite]");

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("normalize=0"), "should include normalize=0");
  assert.ok(filterStr.includes("alimiter"), "should include alimiter");
});

test("mixAudiosFromMovieBeats: explicit mode - beat-level movieVolume triggers normalize=0", () => {
  const context = createContextWithAudioParams();
  context.studio.script.beats = [{ speaker: "Presenter", audioParams: { movieVolume: 0.5 } }];
  const ffmpegContext = FfmpegContextInit();
  mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("normalize=0"), "should include normalize=0");
  assert.ok(filterStr.includes("alimiter"), "should include alimiter");
});

test("mixAudiosFromMovieBeats: explicit mode - does not apply ttsVolume to artifact audio", () => {
  const context = createContextWithAudioParams({ ttsVolume: 0.7 });
  const ffmpegContext = FfmpegContextInit();
  mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1"], context);

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(!filterStr.includes("volume=0.7"), "should not apply ttsVolume in movie-stage mixing");
  assert.ok(filterStr.includes("normalize=0"), "should keep explicit mode normalize=0");
});

test("mixAudiosFromMovieBeats: ducking - uses normalize=0 and alimiter (same as explicit mode)", () => {
  const context = createContextWithAudioParams({ ducking: {} });
  const ffmpegContext = FfmpegContextInit();
  const result = mixAudiosFromMovieBeats(ffmpegContext, "0:a", ["a1", "a2"], context);
  assert.strictEqual(result, "[composite]");

  const filterStr = ffmpegContext.filterComplex.join(";");
  assert.ok(filterStr.includes("normalize=0"), "should include normalize=0");
  assert.ok(filterStr.includes("alimiter"), "should include alimiter");
});
