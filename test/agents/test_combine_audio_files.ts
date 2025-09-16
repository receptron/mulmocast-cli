import test from "node:test";
import assert from "node:assert";

import { createMockContext, createMockBeat } from "../actions/utils.js";
import { createStudioData } from "../../src/utils/context.js";
import { updateDurations } from "../../src/agents/combine_audio_files_agent.js";

test("updateDurations audio duration", async () => {
  const mediaDurations = [
    {
      movieDuration: 123,
      audioDuration: 333,
      hasMedia: false,
      silenceDuration: 222,
      hasMovieAudio: false,
    },
  ];
  const beat = createMockBeat({
    duration: 1,
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat);
  mock.studio = createStudioData(mock.studio.script, "test");
  const res = updateDurations(mock, mediaDurations);
  assert.strictEqual(res[0], 123);
});

test("updateDurations movie duration", async () => {
  const mediaDurations = [
    {
      movieDuration: 123,
      audioDuration: 0,
      hasMedia: false,
      silenceDuration: 222,
      hasMovieAudio: false,
    },
  ];
  const beat = createMockBeat({
    duration: 1,
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat);
  const res = updateDurations(mock, mediaDurations);
  assert.strictEqual(res[0], 123);
});

test("updateDurations just beat duration", async () => {
  const mediaDurations = [
    {
      movieDuration: 0,
      audioDuration: 0,
      hasMedia: false,
      silenceDuration: 222,
      hasMovieAudio: false,
    },
  ];
  const beat = createMockBeat({
    duration: 123,
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat);
  const res = updateDurations(mock, mediaDurations);
  assert.strictEqual(res[0], 123);
});

test("updateDurations voice-over beat with movie", async () => {
  const mediaDurations = [
    {
      movieDuration: 300, // 5 minutes of movie content
      audioDuration: 120, // 2 minutes of audio
      hasMedia: true,
      silenceDuration: 0,
      hasMovieAudio: true,
    },
    {
      movieDuration: 0, // Second beat in voice-over group
      audioDuration: 60, // 1 minute of audio
      hasMedia: false,
      silenceDuration: 0,
      hasMovieAudio: false,
    },
  ];

  // Create two beats where the second one is a voice-over
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
      startAt: 150, // Start at 2.5 minutes into the movie
    },
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2);
  mock.studio = createStudioData(mock.studio.script, "test");

  const res = updateDurations(mock, mediaDurations);

  // First beat should use remaining time after voice-over starts
  assert.strictEqual(res[0], 150); // 2.5 minutes until voice-over starts
  // Second beat should use the remaining movie duration
  assert.strictEqual(res[1], 150); // Remaining 2.5 minutes of movie
});

test("updateDurations spilled over audio", async () => {
  const mediaDurations = [
    {
      movieDuration: 0,
      audioDuration: 180, // 3 minutes of audio (longer than just this beat)
      hasMedia: true,
      silenceDuration: 0,
      hasMovieAudio: false,
    },
    {
      movieDuration: 0,
      audioDuration: 0, // No audio, will receive spilled over audio
      hasMedia: false,
      silenceDuration: 0,
      hasMovieAudio: false,
    },
    {
      movieDuration: 0,
      audioDuration: 0, // No audio, will receive spilled over audio
      hasMedia: false,
      silenceDuration: 0,
      hasMovieAudio: false,
    },
  ];

  // Create three beats where first has long audio that spills to the next beats
  const beat1 = createMockBeat({
    duration: 60, // 1 minute specified duration
  });
  const beat2 = createMockBeat({
    duration: 60, // 1 minute specified duration
  });
  const beat3 = createMockBeat({
    // No duration specified, gets remaining audio
  });

  const mock = createMockContext();
  mock.studio.script.beats.push(beat1, beat2, beat3);
  mock.studio = createStudioData(mock.studio.script, "test");

  const res = updateDurations(mock, mediaDurations);

  // First beat gets its specified duration
  assert.strictEqual(res[0], 60);
  // Second beat gets its specified duration
  assert.strictEqual(res[1], 60);
  // Third beat gets remaining audio (180 - 60 - 60 = 60)
  assert.strictEqual(res[2], 60);
});
