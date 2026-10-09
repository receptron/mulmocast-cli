import test from "node:test";
import assert from "node:assert";
import path from "node:path";

import {
  addSoundEffects,
  buildSoundEffectFilters,
  getSoundEffectPlacements,
  resolveAddBgmFilterConfig,
  resolveAddBgmMixParams,
  soundEffectGain,
} from "../../src/agents/add_bgm_agent.js";
import type { MulmoStudioContext } from "../../src/types/index.js";
import { FfmpegContextInit } from "../../src/utils/ffmpeg_utils.js";
import { mulmoBeatSoundEffectSchema } from "../../src/types/schema.js";

type AudioParams = MulmoStudioContext["presentationStyle"]["audioParams"];

const FLOAT_TOLERANCE = 1e-9;
const approxEqual = (actual: number, expected: number): boolean => Math.abs(actual - expected) < FLOAT_TOLERANCE;

test("resolveAddBgmMixParams: legacy mode keeps voice volume unchanged", () => {
  const { useExplicitMix, voiceVolume } = resolveAddBgmMixParams({
    audioVolume: 1.2,
  } as AudioParams);
  assert.strictEqual(useExplicitMix, false);
  assert.ok(approxEqual(voiceVolume, 1.2), `expected 1.2, got ${voiceVolume}`);
});

test("resolveAddBgmMixParams: explicit mode applies ttsVolume to voice only", () => {
  const { useExplicitMix, voiceVolume } = resolveAddBgmMixParams({
    audioVolume: 0.8,
    ttsVolume: 0.5,
  } as AudioParams);
  assert.strictEqual(useExplicitMix, true);
  assert.ok(approxEqual(voiceVolume, 0.4), `expected 0.4, got ${voiceVolume}`);
});

test("resolveAddBgmFilterConfig: legacy mode has no limiter", () => {
  const config = resolveAddBgmFilterConfig(false);
  assert.strictEqual(config.amixNormalize, "");
  assert.strictEqual(config.mixedOutputId, "mixed");
  assert.strictEqual(config.limiterFilter, undefined);
});

test("resolveAddBgmFilterConfig: explicit mode enables normalize=0 and limiter", () => {
  const config = resolveAddBgmFilterConfig(true);
  assert.strictEqual(config.amixNormalize, ":normalize=0");
  assert.strictEqual(config.mixedOutputId, "mixed_limited");
  assert.ok(config.limiterFilter?.includes("alimiter"), "explicit mode should include limiter");
});

test("resolveAddBgmFilterConfig: limiter takes the sound-effect mix as input", () => {
  const config = resolveAddBgmFilterConfig(true, "mixed_sfx");
  assert.strictEqual(config.mixedOutputId, "mixed_limited");
  assert.ok(config.limiterFilter?.startsWith("[mixed_sfx]alimiter"));
  assert.strictEqual(resolveAddBgmFilterConfig(false, "mixed_sfx").mixedOutputId, "mixed_sfx");
});

const tick = { kind: "url" as const, url: "https://example.com/tick.wav" };
const pop = { kind: "url" as const, url: "https://example.com/pop.mp3" };

const makeContext = (soundEffects: unknown[][], startAts: (number | undefined)[], introPadding = 1.0, durations: number[] = []) =>
  ({
    fileDirs: { mulmoFileDirPath: "/scripts" },
    presentationStyle: { audioParams: { introPadding, outroPadding: 0 } },
    studio: {
      script: { beats: soundEffects.map((effects) => (effects.length > 0 ? { text: "", soundEffects: effects } : { text: "" })) },
      beats: startAts.map((startAt, index) => ({ startAt, duration: durations[index] })),
    },
  }) as unknown as MulmoStudioContext;

test("getSoundEffectPlacements: places effects from when each beat appears on screen", () => {
  const context = makeContext(
    [
      [{ source: tick, startAt: 0.5, volume: 0.8 }],
      [],
      [
        { source: pop, startAt: 0, volume: 1 },
        { source: { kind: "path", path: "se/boing.mp3" }, startAt: 1.25, volume: 2 },
      ],
    ],
    [0, 3, 5.5],
  );
  assert.deepStrictEqual(getSoundEffectPlacements(context), [
    // The first beat is on screen from 0; later beats appear when their narration starts (after introPadding).
    { file: "https://example.com/tick.wav", startAt: 0.5, volume: 0.8, loop: false },
    { file: "https://example.com/pop.mp3", startAt: 6.5, volume: 1, loop: false },
    { file: path.resolve("/scripts", "se/boing.mp3"), startAt: 7.75, volume: 2, loop: false },
  ]);
});

test("getSoundEffectPlacements: defaults startAt to 0 and volume to 1", () => {
  const context = makeContext([[], [{ source: tick }]], [0, 2], 0);
  assert.deepStrictEqual(getSoundEffectPlacements(context), [{ file: "https://example.com/tick.wav", startAt: 2, volume: 1, loop: false }]);
});

test("getSoundEffectPlacements: no effects yields an empty list", () => {
  assert.deepStrictEqual(getSoundEffectPlacements(makeContext([[], []], [0, 1])), []);
});

test("getSoundEffectPlacements: rejects base64 sources and missing beat startAt", () => {
  assert.throws(() => getSoundEffectPlacements(makeContext([[{ source: { kind: "base64", data: "AAAA" } }]], [0])), /unsupported source/);
  assert.throws(() => getSoundEffectPlacements(makeContext([[{ source: tick }]], [undefined])), /startAt of beat 0/);
});

test("getSoundEffectPlacements: loop without duration plays until the end of the beat", () => {
  const context = makeContext(
    [
      [
        { source: tick, startAt: 1, loop: true },
        { source: pop, duration: 0.5, loop: true },
        { source: pop, duration: 2 },
      ],
    ],
    [0],
    0,
    [5],
  );
  const [looped, loopedWithDuration, trimmed] = getSoundEffectPlacements(context);
  assert.strictEqual(looped.duration, 4);
  assert.strictEqual(looped.loop, true);
  assert.strictEqual(loopedWithDuration.duration, 0.5);
  assert.strictEqual(trimmed.duration, 2);
  assert.strictEqual(trimmed.loop, false);
});

test("getSoundEffectPlacements: looping effect that starts after the beat ends is rejected", () => {
  assert.throws(() => getSoundEffectPlacements(makeContext([[{ source: tick, startAt: 3, loop: true }]], [0], 0, [2])), /after the end of the beat/);
});

test("buildSoundEffectFilters: duration trims with a short fade-out", () => {
  const [filter] = buildSoundEffectFilters([1], [{ file: "a.wav", startAt: 0, volume: 1, duration: 4, loop: true }], 1, "sfx");
  assert.ok(filter.includes("atrim=duration=4, afade=t=out:st=3.95:d=0.05, volume=1"), filter);
});

test("soundEffectGain: matches amix normalization of the voice", () => {
  assert.strictEqual(soundEffectGain(false), 0.5);
  assert.strictEqual(soundEffectGain(true), 1.0);
});

test("buildSoundEffectFilters: single effect is delayed, scaled and passed through", () => {
  const filters = buildSoundEffectFilters([3], [{ file: "a.wav", startAt: 1.5, volume: 0.8, loop: false }], 0.5, "sfx");
  assert.deepStrictEqual(filters, [
    "[3:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, volume=0.4, adelay=1500|1500[se_0]",
    "[se_0]anull[sfx]",
  ]);
});

test("buildSoundEffectFilters: multiple effects are mixed without normalization", () => {
  const filters = buildSoundEffectFilters(
    [2, 3],
    [
      { file: "a.wav", startAt: 0, volume: 1, loop: false },
      { file: "b.wav", startAt: 2.0004, volume: 1, loop: false },
    ],
    1,
    "sfx",
  );
  assert.strictEqual(filters.length, 3);
  assert.ok(filters[1].includes("adelay=2000|2000[se_1]"));
  assert.strictEqual(filters[2], "[se_0][se_1]amix=inputs=2:duration=longest:normalize=0[sfx]");
});

test("addSoundEffects: narration volume settings do not scale sound effects", () => {
  const filtersFor = (audioParams: Record<string, unknown>) => {
    const context = makeContext([[{ source: tick, volume: 0.8 }]], [0], 0);
    Object.assign(context.presentationStyle.audioParams, audioParams);
    const ffmpegContext = FfmpegContextInit();
    assert.strictEqual(addSoundEffects(ffmpegContext, context), "mixed_sfx");
    return ffmpegContext.filterComplex.join("\n");
  };
  // Legacy mode: only the amix compensation (0.5) applies, whatever audioVolume is.
  assert.ok(filtersFor({ audioVolume: 0.3 }).includes("volume=0.4,"));
  assert.ok(filtersFor({ audioVolume: 0 }).includes("volume=0.4,"));
  // Explicit mode: neither audioVolume nor ttsVolume reaches the effect.
  assert.ok(filtersFor({ audioVolume: 0.3, ttsVolume: 0.2 }).includes("volume=0.8,"));
});

test("addSoundEffects: no effects leaves the graph untouched", () => {
  const ffmpegContext = FfmpegContextInit();
  assert.strictEqual(addSoundEffects(ffmpegContext, makeContext([[]], [0])), "mixed");
  assert.deepStrictEqual(ffmpegContext.filterComplex, []);
});

test("mulmoBeatSoundEffectSchema: accepts url and path sources, rejects base64", () => {
  assert.ok(mulmoBeatSoundEffectSchema.safeParse({ source: tick }).success);
  assert.ok(mulmoBeatSoundEffectSchema.safeParse({ source: { kind: "path", path: "se/pop.mp3" } }).success);
  assert.strictEqual(mulmoBeatSoundEffectSchema.safeParse({ source: { kind: "base64", data: "AAAA" } }).success, false);
});

test("getSoundEffectPlacements: a looping effect fills the beat's time on screen, intro and outro included", () => {
  const context = makeContext([[{ source: tick, loop: true }], [{ source: pop, startAt: 0.5, loop: true }]], [0, 3], 1.0, [3, 2]);
  context.presentationStyle.audioParams.outroPadding = 1.5;
  const [first, last] = getSoundEffectPlacements(context);
  assert.deepStrictEqual([first.startAt, first.duration], [0, 4]); // 1.0 intro + 3
  assert.deepStrictEqual([last.startAt, last.duration], [4.5, 3]); // 2 + 1.5 outro - 0.5
});

test("getSoundEffectPlacements: a looping effect lasts while its shot stays on screen through trailing voice_over beats", () => {
  const context = makeContext(
    [[{ source: tick, loop: true }], [{ source: pop, loop: true }], [], [{ source: pop, startAt: 1, loop: true }]],
    [0, 3, 5, 9],
    1.0,
    [3, 2, 4, 2],
  );
  context.studio.script.beats[1].image = { type: "voice_over" } as never;
  context.studio.script.beats[2].image = { type: "voice_over" } as never;
  const [owner, voiceOver, last] = getSoundEffectPlacements(context);
  assert.deepStrictEqual([owner.startAt, owner.duration], [0, 10]); // 1 intro + 3 + voice_overs 2 + 4
  assert.deepStrictEqual([voiceOver.startAt, voiceOver.duration], [4, 2]); // its own slice
  assert.deepStrictEqual([last.startAt, last.duration], [11, 1]); // 2 - 1 (no outro padding here)
});

test("getSoundEffectPlacements: a looping effect in a single-beat script lasts through the outro", () => {
  const context = makeContext([[{ source: tick, startAt: 0.5, loop: true }]], [0], 1.0, [3]);
  context.presentationStyle.audioParams.outroPadding = 1.5;
  const [looped] = getSoundEffectPlacements(context);
  assert.deepStrictEqual([looped.startAt, looped.duration], [0.5, 5]); // 1 intro + 3 + 1.5 outro - 0.5
});
