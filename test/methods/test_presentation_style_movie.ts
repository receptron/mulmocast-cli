import test from "node:test";
import assert from "node:assert";

import { MulmoPresentationStyleMethods } from "../../src/methods/mulmo_presentation_style.js";
import { createMockContext } from "../actions/utils.js";
import { MulmoStudioContext, MulmoBeat, MulmoPresentationStyle } from "../../src/types/index.js";

const FLOAT_TOLERANCE = 1e-9;
const approxEqual = (actual: number, expected: number): boolean => Math.abs(actual - expected) < FLOAT_TOLERANCE;

const frameCheckContext = (beats: Partial<MulmoBeat>[], presentationStyle: Partial<MulmoPresentationStyle> = {}) =>
  ({
    studio: { script: { beats } },
    presentationStyle,
  }) as unknown as MulmoStudioContext;

const transition = (type: string) => ({ movieParams: { transition: { type, duration: 1.0 } } });
const voiceOver = { image: { type: "voice_over" } };

// --- getNeedFirstFrame ---

test("test getNeedFirstFrame with slidein transitions", async () => {
  const context = frameCheckContext([
    { speaker: "A" },
    { speaker: "B", ...transition("slidein_left") },
    { speaker: "C", ...transition("slidein_right") },
    { speaker: "D", ...transition("fade") },
  ]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, true, true, false]);
});

test("test getNeedFirstFrame with wipe transitions", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { speaker: "B", ...transition("wipeleft") }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, true]);
});

test("test getNeedFirstFrame with no transitions", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, false, false]);
});

test("test getNeedFirstFrame first beat cannot have transition", async () => {
  const context = frameCheckContext([{ speaker: "A", ...transition("slidein_left") }, { speaker: "B" }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, false]);
});

test("test getNeedFirstFrame applies the presentationStyle transition to every beat", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }], {
    movieParams: { transition: { type: "slidein_up", duration: 1.0 } },
  });

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, true, true]);
});

test("test getNeedFirstFrame never asks a voice_over beat for a frame", async () => {
  // The voice_over shares the previous shot, so the transition of the following beat is
  // resolved against beat 0 -- and the voice_over itself supplies nothing.
  const context = frameCheckContext([{ speaker: "A" }, { ...voiceOver, ...transition("slidein_left") }, { speaker: "B", ...transition("slidein_left") }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, false, true]);
});

test("test getNeedFirstFrame skips the transition when only voice_over beats precede", async () => {
  const context = frameCheckContext([{ ...voiceOver }, { speaker: "A", ...transition("slidein_left") }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(context), [false, false]);
});

test("test getNeedFirstFrame on an empty script", async () => {
  assert.deepEqual(MulmoPresentationStyleMethods.getNeedFirstFrame(frameCheckContext([])), []);
});

// --- getNeedLastFrame ---

test("test getNeedLastFrame with transitions on next beats", async () => {
  const context = frameCheckContext([
    { speaker: "A" },
    { speaker: "B", ...transition("fade") },
    { speaker: "C", ...transition("slideout_left") },
    { speaker: "D" },
  ]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(context), [true, true, false, false]);
});

test("test getNeedLastFrame with no transitions", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(context), [false, false, false]);
});

test("test getNeedLastFrame last beat never needs last frame", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { speaker: "B", ...transition("fade") }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(context), [true, false]);
});

test("test getNeedLastFrame reads the transition of the next rendered beat", async () => {
  // Beat 0 owns the shot the voice_over shares, so it is the one which must supply _last
  // for the transition declared on beat 2.
  const context = frameCheckContext([{ speaker: "A" }, { ...voiceOver }, { speaker: "B", ...transition("fade") }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(context), [true, false, false]);
});

test("test getNeedLastFrame ignores a trailing voice_over group", async () => {
  const context = frameCheckContext([{ speaker: "A" }, { ...voiceOver }, { ...voiceOver }]);

  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(context), [false, false, false]);
});

test("test getNeedLastFrame on an empty script", async () => {
  assert.deepEqual(MulmoPresentationStyleMethods.getNeedLastFrame(frameCheckContext([])), []);
});

// --- getFillOption ---

test("test getFillOption with defaults only", async () => {
  const context = frameCheckContext([]);
  const result = MulmoPresentationStyleMethods.getFillOption(context, { speaker: "A" });
  assert.equal(result.style, "aspectFit");
});

test("test getFillOption with global setting", async () => {
  const context = frameCheckContext([], { movieParams: { fillOption: { style: "aspectFill" } } });
  const result = MulmoPresentationStyleMethods.getFillOption(context, { speaker: "A" });
  assert.equal(result.style, "aspectFill");
});

test("test getFillOption with beat override", async () => {
  const context = frameCheckContext([], { movieParams: { fillOption: { style: "aspectFill" } } });
  const beat: MulmoBeat = { speaker: "A", movieParams: { fillOption: { style: "aspectFit" } } };
  const result = MulmoPresentationStyleMethods.getFillOption(context, beat);
  assert.equal(result.style, "aspectFit");
});

test("test getFillOption with beat override and no global setting", async () => {
  const context = frameCheckContext([]);
  const beat: MulmoBeat = { speaker: "A", movieParams: { fillOption: { style: "aspectFill" } } };
  const result = MulmoPresentationStyleMethods.getFillOption(context, beat);
  assert.equal(result.style, "aspectFill");
});

// --- getMovieVolume ---

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

const beatWithText: MulmoBeat = { speaker: "Presenter", text: "Hello" };
const beatWithoutText: MulmoBeat = { speaker: "Presenter" };

test("getMovieVolume: no ducking, no movieVolume - returns 1.0", () => {
  const context = createContextWithAudioParams();
  assert.strictEqual(MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText), 1.0);
});

test("getMovieVolume: script-level movieVolume - returns script value", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.5 });
  assert.strictEqual(MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText), 0.5);
});

test("getMovieVolume: beat-level movieVolume overrides script-level", () => {
  const context = createContextWithAudioParams({ movieVolume: 0.5 });
  const beat: MulmoBeat = { speaker: "Presenter", text: "Hello", audioParams: { movieVolume: 0.8 } };
  const result = MulmoPresentationStyleMethods.getMovieVolume(context, beat);
  assert.ok(approxEqual(result, 0.8), `expected 0.8, got ${result}`);
});

test("getMovieVolume: ducking with TTS - applies default ratio 0.3", () => {
  const context = createContextWithAudioParams({ ducking: {} });
  const result = MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText);
  assert.ok(approxEqual(result, 1.0 * 0.3), `expected ${1.0 * 0.3}, got ${result}`);
});

test("getMovieVolume: ducking without TTS - returns full volume", () => {
  const context = createContextWithAudioParams({ ducking: {} });
  assert.strictEqual(MulmoPresentationStyleMethods.getMovieVolume(context, beatWithoutText), 1.0);
});

test("getMovieVolume: ducking with custom ratio", () => {
  const context = createContextWithAudioParams({ ducking: { ratio: 0.5 } });
  assert.strictEqual(MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText), 1.0 * 0.5);
});

test("getMovieVolume: ducking with movieVolume and custom ratio", () => {
  const context = createContextWithAudioParams({ ducking: { ratio: 0.5 }, movieVolume: 0.4 });
  const result = MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText);
  assert.ok(approxEqual(result, 0.4 * 0.5), `expected ${0.4 * 0.5}, got ${result}`);
});

test("getMovieVolume: ducking with beat-level movieVolume override", () => {
  const context = createContextWithAudioParams({ ducking: {}, movieVolume: 0.4 });
  const beat: MulmoBeat = { speaker: "Presenter", text: "Hello", audioParams: { movieVolume: 0.8 } };
  const result = MulmoPresentationStyleMethods.getMovieVolume(context, beat);
  assert.ok(approxEqual(result, 0.8 * 0.3), `expected ${0.8 * 0.3}, got ${result}`);
});

test("getMovieVolume: ducking + suppressSpeech - no ducking applied", () => {
  const context = createContextWithAudioParams({ ducking: {}, suppressSpeech: true });
  const result = MulmoPresentationStyleMethods.getMovieVolume(context, beatWithText);
  assert.strictEqual(result, 1.0, "should return full volume because speech is suppressed");
});
