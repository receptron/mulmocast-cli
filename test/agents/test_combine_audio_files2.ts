import test from "node:test";
import assert from "node:assert";

import { createMockContext, createMockBeat } from "../actions/utils.js";
import { createStudioData } from "../../src/utils/context.js";
import {
  getPadding,
  getTotalPadding,
  getGroupBeatDurations,
  voiceOverProcess,
  spilledOverAudio,
  noSpilledOverAudio,
  type MediaDuration,
} from "../../src/agents/combine_audio_files_agent.js";

// getPadding function tests
test("getPadding with custom beat padding", () => {
  const beat = createMockBeat({
    audioParams: {
      padding: 3.5,
    },
  });
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 1.0,
  };
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getPadding(mock, beat, 0);
  assert.strictEqual(result, 3.5); // Should use beat's custom padding
});

test("getPadding for last beat", () => {
  const beat = createMockBeat({});
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 1.0,
  };
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getPadding(mock, beat, 0); // Only beat, so it's the last one
  assert.strictEqual(result, 0); // Last beat gets 0 padding
});

test("getPadding for second-to-last beat (closing gap)", () => {
  const beat1 = createMockBeat({});
  const beat2 = createMockBeat({});
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 1.5,
  };
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getPadding(mock, beat1, 0); // First of two beats (second-to-last)
  assert.strictEqual(result, 1.5); // Should use closingPadding
});

test("getPadding for regular beat", () => {
  const beat1 = createMockBeat({});
  const beat2 = createMockBeat({});
  const beat3 = createMockBeat({});
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 1.0,
  };
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getPadding(mock, beat1, 0); // First of three beats
  assert.strictEqual(result, 2.0); // Should use regular padding
});

// getTotalPadding function tests
test("getTotalPadding with movie duration", () => {
  const result = getTotalPadding(2.0, 50, 30);
  assert.strictEqual(result, 22.0); // padding + (movieDuration - audioDuration) = 2 + 20 = 22
});

test("getTotalPadding with specified beat duration", () => {
  const result = getTotalPadding(2.0, 0, 30, 45);
  assert.strictEqual(result, 17.0); // padding + (duration - audioDuration) = 2 + 15 = 17
});

test("getTotalPadding with movie duration priority over beat duration", () => {
  const result = getTotalPadding(2.0, 50, 30, 40);
  assert.strictEqual(result, 22.0); // Movie duration takes priority: 2 + (50 - 30) = 22
});

test("getTotalPadding with only padding", () => {
  const result = getTotalPadding(2.0, 0, 30);
  assert.strictEqual(result, 2.0); // Just padding when no movie or beat duration
});

test("getTotalPadding with beat duration shorter than audio", () => {
  const result = getTotalPadding(2.0, 0, 30, 25);
  assert.strictEqual(result, 2.0); // Duration < audioDuration, so just padding
});

// getGroupBeatDurations function tests
test("getGroupBeatDurations with all specified durations", () => {
  const beat1 = createMockBeat({ duration: 30 });
  const beat2 = createMockBeat({ duration: 45 });
  const beat3 = createMockBeat({ duration: 25 });
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getGroupBeatDurations(mock, [0, 1, 2], 100);
  assert.deepStrictEqual(result, [30, 45, 25]); // Should use specified durations
});

test("getGroupBeatDurations with all unspecified durations", () => {
  const beat1 = createMockBeat({});
  const beat2 = createMockBeat({});
  const beat3 = createMockBeat({});
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getGroupBeatDurations(mock, [0, 1, 2], 90);
  assert.deepStrictEqual(result, [30, 30, 30]); // Should divide audio equally: 90/3 = 30
});

test("getGroupBeatDurations with mixed specified and unspecified", () => {
  const beat1 = createMockBeat({ duration: 40 });
  const beat2 = createMockBeat({});
  const beat3 = createMockBeat({ duration: 30 });
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getGroupBeatDurations(mock, [0, 1, 2], 100);
  // Specified: 40 + 30 = 70, remaining: 100 - 70 = 30 for unspecified beat
  assert.deepStrictEqual(result, [40, 30, 30]);
});

test("getGroupBeatDurations with minimum duration enforcement", () => {
  const beat1 = createMockBeat({});
  const beat2 = createMockBeat({});
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getGroupBeatDurations(mock, [0, 1], 1.5);
  // Min total = 2 * 1.0 = 2.0 > 1.5, so each gets 1.0
  assert.deepStrictEqual(result, [1.0, 1.0]);
});

test("getGroupBeatDurations with insufficient audio for specified durations", () => {
  const beat1 = createMockBeat({ duration: 40 });
  const beat2 = createMockBeat({ duration: 50 });
  const beat3 = createMockBeat({});
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const result = getGroupBeatDurations(mock, [0, 1, 2], 80);
  // Specified: 40 + 50 = 90 > 80, but minTotal = 1.0, so rest = max(80-90, 1) = 1
  assert.deepStrictEqual(result, [40, 50, 1.0]);
});

// voiceOverProcess function tests
test("voiceOverProcess last in group", () => {
  const beat1 = createMockBeat({
    image: {
      type: "movie",
      source: {
        kind: "path",
        path: "test-movie.mp4",
      },
    },
  });
  const beat2 = createMockBeat({
    image: {
      type: "voice_over",
    },
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 150, audioDuration: 30, hasMedia: true, silenceDuration: 0, hasMovieAudio: true },
    { movieDuration: 0, audioDuration: 40, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];

  const beatDurations: number[] = [];
  const processor = voiceOverProcess(mock, mediaDurations, 150, beatDurations, 2);

  // Process last voice-over beat in group (index 1, iGroup 1) - last in group gets all remaining
  const remaining = processor(150, 1, 1);
  assert.strictEqual(remaining, 0); // Last beat gets all remaining
  assert.strictEqual(beatDurations[0], 150); // Gets all remaining duration
  assert.strictEqual(mediaDurations[1].silenceDuration, 110); // 150 - 40 = 110
});

test("voiceOverProcess without startAt", () => {
  const beat1 = createMockBeat({
    image: {
      type: "movie",
      source: {
        kind: "path",
        path: "test-movie.mp4",
      },
    },
  });
  const beat2 = createMockBeat({
    image: {
      type: "voice_over",
      // No startAt
    },
  });
  const beat3 = createMockBeat({
    image: {
      type: "voice_over",
      // Third beat so we have a proper next beat for the logic
    },
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 100, audioDuration: 25, hasMedia: true, silenceDuration: 0, hasMovieAudio: true },
    { movieDuration: 0, audioDuration: 30, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 20, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];

  const beatDurations: number[] = [];
  const processor = voiceOverProcess(mock, mediaDurations, 100, beatDurations, 3);

  // Process first voice-over beat (index 1, iGroup 0) - checks next beat which has no startAt
  const remaining = processor(100, 1, 0);
  assert.strictEqual(remaining, 70); // 100 - 30 = 70
  assert.strictEqual(beatDurations[0], 30); // Uses audio duration when next beat has no startAt
});

// spilledOverAudio function tests
test("spilledOverAudio with exact audio match", () => {
  const beat1 = createMockBeat({ duration: 40 });
  const beat2 = createMockBeat({ duration: 35 });
  const beat3 = createMockBeat({});
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 90, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];

  const beatDurations: number[] = [];
  spilledOverAudio(mock, [0, 1, 2], 90, beatDurations, mediaDurations);

  // Should distribute as: 40, 35, 15 (remaining after specified)
  assert.deepStrictEqual(beatDurations, [40, 35, 15]);
  assert.strictEqual(mediaDurations[0].silenceDuration, 0);
  assert.strictEqual(mediaDurations[1].silenceDuration, 0);
  assert.strictEqual(mediaDurations[2].silenceDuration, 0);
});

test("spilledOverAudio with excess audio", () => {
  const beat1 = createMockBeat({ duration: 30 });
  const beat2 = createMockBeat({ duration: 25 });
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 80, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];

  const beatDurations: number[] = [];
  spilledOverAudio(mock, [0, 1], 80, beatDurations, mediaDurations);

  // Total specified: 55, excess: 25, goes to last beat
  assert.deepStrictEqual(beatDurations, [30, 50]); // 25 + 25 = 50 for second beat
});

test("spilledOverAudio with insufficient audio", () => {
  const beat1 = createMockBeat({ duration: 40 });
  const beat2 = createMockBeat({ duration: 35 });
  const beat3 = createMockBeat({});
  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 60, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];

  const beatDurations: number[] = [];
  spilledOverAudio(mock, [0, 1, 2], 60, beatDurations, mediaDurations);

  // Total needed: 76 (40 + 35 + 1), available: 60
  // First beat: 40 (full), remaining 20
  // Second beat: 35 but only 20 available, so 15 silence needed
  // Third beat: 1 (minimum), all silence
  assert.deepStrictEqual(beatDurations, [40, 35, 1]);
  assert.strictEqual(mediaDurations[1].silenceDuration, 15); // 35 - 20 = 15
  assert.strictEqual(mediaDurations[2].silenceDuration, 1); // All silence
});

// noSpilledOverAudio function tests
test("noSpilledOverAudio with audio only", () => {
  const beat = createMockBeat({});
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 0.0,
  };
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 30, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
  ];
  const beatDurations: number[] = [];

  noSpilledOverAudio(mock, beat, 0, 0, 30, beatDurations, mediaDurations);

  assert.strictEqual(beatDurations[0], 30); // Audio duration (no padding for last beat)
  assert.strictEqual(mediaDurations[0].silenceDuration, 0);
});

test("noSpilledOverAudio with movie and audio", () => {
  const beat1 = createMockBeat({});
  const beat2 = createMockBeat({});
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 1.0,
  };
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 50, audioDuration: 30, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
    { movieDuration: 0, audioDuration: 0, hasMedia: false, silenceDuration: 0, hasMovieAudio: false },
  ];
  const beatDurations: number[] = [];

  noSpilledOverAudio(mock, beat1, 0, 50, 30, beatDurations, mediaDurations);

  // Total padding = 1.0 + (50 - 30) = 21.0 (closingPadding + movie extra)
  // Beat duration = 30 + 21 = 51
  assert.strictEqual(beatDurations[0], 51);
  assert.strictEqual(mediaDurations[0].silenceDuration, 21);
});

test("noSpilledOverAudio with specified beat duration", () => {
  const beat = createMockBeat({ duration: 45 });
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 0.0,
  };
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 25, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
  ];
  const beatDurations: number[] = [];

  noSpilledOverAudio(mock, beat, 0, 0, 25, beatDurations, mediaDurations);

  // Total padding = 0 + (45 - 25) = 20.0
  // Beat duration = 25 + 20 = 45
  assert.strictEqual(beatDurations[0], 45);
  assert.strictEqual(mediaDurations[0].silenceDuration, 20);
});

test("noSpilledOverAudio with custom beat padding", () => {
  const beat = createMockBeat({
    audioParams: {
      padding: 5.0,
    },
  });
  const mock = createMockContext();
  mock.presentationStyle.audioParams = {
    padding: 2.0,
    closingPadding: 0.0,
  };
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");

  const mediaDurations: MediaDuration[] = [
    { movieDuration: 0, audioDuration: 30, hasMedia: true, silenceDuration: 0, hasMovieAudio: false },
  ];
  const beatDurations: number[] = [];

  noSpilledOverAudio(mock, beat, 0, 0, 30, beatDurations, mediaDurations);

  // Uses custom padding: 30 + 5 = 35
  assert.strictEqual(beatDurations[0], 35);
  assert.strictEqual(mediaDurations[0].silenceDuration, 5);
});