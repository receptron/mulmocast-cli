import test from "node:test";
import assert from "node:assert";

import { MulmoStudioContextMethods } from "../../src/methods/mulmo_studio_context.js";
import { MulmoStudioContext, MulmoBeat } from "../../src/types/index.js";

const voiceOver = { image: { type: "voice_over" } } as unknown as MulmoBeat;
const shot = (speaker: string) => ({ speaker }) as unknown as MulmoBeat;

const durationContext = (scriptBeats: MulmoBeat[], durations: (number | undefined)[], introPadding = 0, outroPadding = 0) =>
  ({
    studio: {
      script: { beats: scriptBeats },
      beats: durations.map((duration) => ({ duration })),
    },
    presentationStyle: { audioParams: { introPadding, outroPadding } },
  }) as unknown as MulmoStudioContext;

// --- getExtraPadding ---

test("test getExtraPadding for first beat", async () => {
  const context = durationContext([shot("A"), shot("B"), shot("C")], [0, 0, 0], 2.0, 3.0);
  assert.equal(MulmoStudioContextMethods.getExtraPadding(context, 0), 2.0);
});

test("test getExtraPadding for last beat", async () => {
  const context = durationContext([shot("A"), shot("B"), shot("C")], [0, 0, 0], 2.0, 3.0);
  assert.equal(MulmoStudioContextMethods.getExtraPadding(context, 2), 3.0);
});

test("test getExtraPadding for middle beat", async () => {
  const context = durationContext([shot("A"), shot("B"), shot("C")], [0, 0, 0], 2.0, 3.0);
  assert.equal(MulmoStudioContextMethods.getExtraPadding(context, 1), 0);
});

test("test getExtraPadding gives the intro padding to a single beat script", async () => {
  // The only beat is both the first and the last one: the intro padding wins.
  const context = durationContext([shot("A")], [0], 2.0, 3.0);
  assert.equal(MulmoStudioContextMethods.getExtraPadding(context, 0), 2.0);
});

test("test getExtraPadding drops the intro padding when the first beat lip-syncs", async () => {
  // Lip sync has to start at t=0, otherwise the mouth movement drifts from the audio.
  const context = durationContext([shot("A"), shot("B")], [0, 0], 2.0, 3.0);
  context.studio.script.beats[0].enableLipSync = true;
  assert.equal(MulmoStudioContextMethods.getExtraPadding(context, 0), 0);
});

// --- getBeatDuration ---

test("test getBeatDuration adds intro and outro padding", async () => {
  const context = durationContext([shot("A"), shot("B"), shot("C")], [1.0, 2.0, 3.0], 1.5, 2.5);
  assert.equal(MulmoStudioContextMethods.getBeatDuration(context, 0), 2.5); // 1.0 + introPadding
  assert.equal(MulmoStudioContextMethods.getBeatDuration(context, 1), 2.0); // middle beats carry no extra padding
  assert.equal(MulmoStudioContextMethods.getBeatDuration(context, 2), 5.5); // 3.0 + outroPadding
});

test("test getBeatDuration treats a missing duration as zero", async () => {
  const context = durationContext([shot("A"), shot("B")], [undefined, 2.0]);
  assert.equal(MulmoStudioContextMethods.getBeatDuration(context, 0), 0);
});

// --- getVoiceOverGroupDuration ---

test("test getVoiceOverGroupDuration sums the trailing voice_over beats", async () => {
  const context = durationContext([shot("A"), voiceOver, voiceOver, shot("B"), voiceOver], [4.0, 2.0, 1.0, 5.0, 3.0]);
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 0), 3.0); // 2.0 + 1.0
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 1), 1.0); // from inside the group
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 2), 0); // group ends here
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 3), 3.0); // trailing group at the end of the script
});

test("test getVoiceOverGroupDuration includes the outro padding of a trailing voice_over", async () => {
  const context = durationContext([shot("A"), voiceOver], [4.0, 2.0], 0, 1.5);
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 0), 3.5); // 2.0 + outroPadding
});

test("test getVoiceOverGroupDuration is zero for the last beat", async () => {
  const context = durationContext([shot("A"), shot("B")], [4.0, 2.0]);
  assert.equal(MulmoStudioContextMethods.getVoiceOverGroupDuration(context, 1), 0);
});

// --- isMovieBeat ---

const movieBeatContext = () => ({ presentationStyle: {} }) as unknown as MulmoStudioContext;

test("test isMovieBeat recognizes every movie source", async () => {
  const context = movieBeatContext();
  assert.equal(MulmoStudioContextMethods.isMovieBeat(context, { lipSyncFile: "a.mp4" }, shot("A")), true);
  assert.equal(MulmoStudioContextMethods.isMovieBeat(context, { movieFile: "a.mp4" }, shot("A")), true);
  assert.equal(MulmoStudioContextMethods.isMovieBeat(context, {}, { image: { type: "movie", source: { kind: "path", path: "a.mp4" } } }), true);
});

test("test isMovieBeat treats a still beat as a still", async () => {
  const context = movieBeatContext();
  assert.equal(MulmoStudioContextMethods.isMovieBeat(context, {}, shot("A")), false);
  assert.equal(MulmoStudioContextMethods.isMovieBeat(context, { imageFile: "a.png" }, shot("A")), false);
});

// --- getSegmentDuration ---

test("test getSegmentDuration spans the voice_over group", async () => {
  const context = durationContext([shot("A"), voiceOver, shot("B")], [4.716, 2.604, 7.256]);
  assert.ok(Math.abs(MulmoStudioContextMethods.getSegmentDuration(context, 0) - 7.32) < 1e-9); // owner + its voice_over
  assert.equal(MulmoStudioContextMethods.getSegmentDuration(context, 2), 7.256); // no group
});

test("test getSegmentDuration is never shorter than the movie", async () => {
  const context = durationContext([shot("A"), voiceOver], [4.0, 2.0]);
  context.studio.beats[0].movieDuration = 20.0;
  assert.equal(MulmoStudioContextMethods.getSegmentDuration(context, 0), 20.0);
  context.studio.beats[0].movieDuration = 3.0; // shorter than the group: the group wins
  assert.equal(MulmoStudioContextMethods.getSegmentDuration(context, 0), 6.0);
});
