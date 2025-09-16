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

// TODO voice-over beat / movie

// TODO spilled over audi / audio
