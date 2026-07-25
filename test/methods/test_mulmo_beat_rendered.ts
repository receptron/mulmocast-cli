import test from "node:test";
import assert from "node:assert";

import { MulmoBeatMethods } from "../../src/methods/mulmo_beat.js";
import { MulmoBeat } from "../../src/types/index.js";

const voiceOver = { image: { type: "voice_over" } } as unknown as MulmoBeat;
const shot = (speaker: string) => ({ speaker }) as unknown as MulmoBeat;
const beatWithImageType = (type: string) => ({ image: { type } }) as unknown as MulmoBeat;

test("test isVoiceOver recognizes voice_over beats only", async () => {
  assert.equal(MulmoBeatMethods.isVoiceOver(voiceOver), true);
  assert.equal(MulmoBeatMethods.isVoiceOver(beatWithImageType("movie")), false);
  assert.equal(MulmoBeatMethods.isVoiceOver(beatWithImageType("beat")), false);
  assert.equal(MulmoBeatMethods.isVoiceOver(shot("A")), false); // no image at all
});

test("test isVoiceOver tolerates a missing beat", async () => {
  assert.equal(MulmoBeatMethods.isVoiceOver(undefined), false);
});

test("test getPrevRenderedBeatIndex skips voice_over beats", async () => {
  const beats = [shot("A"), voiceOver, voiceOver, shot("B"), voiceOver];
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex(beats, 3), 0); // walks back over two voice_overs
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex(beats, 4), 3);
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex(beats, 1), 0);
});

test("test getPrevRenderedBeatIndex returns -1 when there is no previous shot", async () => {
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex([shot("A"), shot("B")], 0), -1); // first beat
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex([voiceOver, voiceOver, shot("A")], 2), -1); // leading voice_overs
  assert.equal(MulmoBeatMethods.getPrevRenderedBeatIndex([], 0), -1); // empty
});

test("test getNextRenderedBeatIndex skips voice_over beats", async () => {
  const beats = [shot("A"), voiceOver, voiceOver, shot("B"), voiceOver];
  assert.equal(MulmoBeatMethods.getNextRenderedBeatIndex(beats, 0), 3); // walks forward over two voice_overs
  assert.equal(MulmoBeatMethods.getNextRenderedBeatIndex(beats, 2), 3);
});

test("test getNextRenderedBeatIndex returns -1 when no shot follows", async () => {
  assert.equal(MulmoBeatMethods.getNextRenderedBeatIndex([shot("A"), voiceOver, voiceOver], 0), -1); // group ends the script
  assert.equal(MulmoBeatMethods.getNextRenderedBeatIndex([shot("A")], 0), -1); // last beat
  assert.equal(MulmoBeatMethods.getNextRenderedBeatIndex([], 0), -1); // empty
});
