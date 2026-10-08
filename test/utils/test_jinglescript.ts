import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

import { getJingleFilePath, getJingleScores, renderJingleScores, validateJingleScores } from "../../src/utils/jinglescript.js";
import { getSoundEffectPlacements } from "../../src/agents/add_bgm_agent.js";
import { mulmoBeatSoundEffectSchema } from "../../src/types/schema.js";
import type { MulmoStudioContext } from "../../src/types/index.js";
import { trackedTmpDirs } from "../tmp_dirs.js";

const tmpDir = trackedTmpDirs("mulmo-jinglescript-test-");

const pop = {
  format: "jinglescript/1",
  tempo: 120,
  length: { seconds: 0.5 },
  tracks: [{ instrument: "pop", reverb: false, notes: [{ at: 0, vel: 0.9 }] }],
};
const badScore = { format: "jinglescript/1", tempo: 120, length: { seconds: 1 }, tracks: [{ instrument: "kazoo", notes: [{ at: 0 }] }] };

const makeContext = (soundEffects: unknown[][], audioDirPath = tmpDir(), force = false) =>
  ({
    force,
    fileDirs: { mulmoFileDirPath: "/scripts", audioDirPath },
    presentationStyle: { audioParams: { introPadding: 1 } },
    studio: {
      script: { beats: soundEffects.map((effects) => ({ text: "", soundEffects: effects })) },
      beats: soundEffects.map((_, index) => ({ startAt: index * 2, duration: 2 })),
    },
  }) as unknown as MulmoStudioContext;

test("mulmoBeatSoundEffectSchema: accepts a jinglescript source", () => {
  assert.ok(mulmoBeatSoundEffectSchema.safeParse({ source: { kind: "jinglescript", score: pop } }).success);
  assert.strictEqual(mulmoBeatSoundEffectSchema.safeParse({ source: { kind: "jinglescript" } }).success, false);
});

test("getJingleScores: lists only jinglescript sources, with their location", () => {
  const context = makeContext([[{ source: { kind: "url", url: "https://example.com/a.wav" } }], [{ source: { kind: "jinglescript", score: pop } }]]);
  assert.deepStrictEqual(getJingleScores(context), [{ score: pop, beatIndex: 1, effectIndex: 0 }]);
});

test("validateJingleScores: reports every problem with its beat and effect", () => {
  const context = makeContext([[{ source: { kind: "jinglescript", score: pop } }, { source: { kind: "jinglescript", score: badScore } }]]);
  assert.throws(() => validateJingleScores(context), /beats\[0\]\.soundEffects\[1\]\.source\.score: tracks\[0\]\.instrument/);
  assert.doesNotThrow(() => validateJingleScores(makeContext([[{ source: { kind: "jinglescript", score: pop } }]])));
});

test("getJingleFilePath: identical scores share one file, different scores do not", () => {
  const context = makeContext([]);
  assert.strictEqual(getJingleFilePath(pop, context), getJingleFilePath({ ...pop }, context));
  assert.notStrictEqual(getJingleFilePath(pop, context), getJingleFilePath({ ...pop, tempo: 100 }, context));
});

test("renderJingleScores: writes a WAV, reuses it, and re-renders when forced", () => {
  const audioDir = tmpDir();
  const context = makeContext([[{ source: { kind: "jinglescript", score: pop } }]], audioDir);
  const filePath = getJingleFilePath(pop, context);
  renderJingleScores(context);
  assert.ok(fs.statSync(filePath).size > 44);
  assert.strictEqual(fs.readFileSync(filePath).subarray(0, 4).toString(), "RIFF");

  fs.writeFileSync(filePath, "cached");
  renderJingleScores(context);
  assert.strictEqual(fs.readFileSync(filePath, "utf8"), "cached");

  renderJingleScores(makeContext([[{ source: { kind: "jinglescript", score: pop } }]], audioDir, true));
  assert.strictEqual(fs.readFileSync(filePath).subarray(0, 4).toString(), "RIFF");
});

test("getSoundEffectPlacements: a jinglescript source plays its rendered file", () => {
  const context = makeContext([[], [{ source: { kind: "jinglescript", score: pop }, startAt: 0.5 }]]);
  assert.deepStrictEqual(getSoundEffectPlacements(context), [{ file: getJingleFilePath(pop, context), startAt: 3.5, volume: 1, loop: false }]);
});
