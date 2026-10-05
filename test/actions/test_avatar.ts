import test from "node:test";
import assert from "node:assert";

import { planAvatarTracks } from "../../src/actions/avatar.js";
import { addAvatars } from "../../src/actions/movie.js";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import type { MulmoStudioContext, MulmoScript } from "../../src/types/index.js";
import { FfmpegContextInit } from "../../src/utils/ffmpeg_utils.js";

const script = mulmoScriptSchema.parse({
  $mulmocast: { version: "1.1" },
  lang: "ja",
  avatarParams: { position: { scale: "50%" } },
  speechParams: {
    speakers: {
      Miko: {
        voiceId: "coral",
        avatar: { source: "avatars/miko", position: { x: "80%" } },
        // a language override replaces the speaker, but keeps the avatar
        lang: { en: { voiceId: "shimmer" } },
      },
      Narrator: { voiceId: "alloy" },
    },
  },
  beats: [
    { speaker: "Miko", text: "こんにちは！", avatarParams: { emotion: "happy", motions: [{ motion: "nod", at: "こんにちは" }], position: { y: "95%" } } },
    { speaker: "Narrator", text: "ナレーションです。" },
    { speaker: "Miko", text: "隠れます。", avatarParams: { hidden: true } },
    { speaker: "Miko", text: "" },
    { speaker: "Miko", text: "また会いましょう。" },
  ],
}) as MulmoScript;

const createContext = (lang: string): MulmoStudioContext =>
  ({
    lang,
    force: false,
    fileDirs: { mulmoFileDirPath: "/scripts" },
    studio: {
      script,
      filename: "test_avatar",
      beats: [
        { startAt: 0, duration: 2, audioFile: "/audio/0.mp3" },
        { startAt: 2, duration: 3, audioFile: "/audio/1.mp3" },
        { startAt: 5, duration: 2, audioFile: "/audio/2.mp3" },
        { startAt: 7, duration: 1 },
        { startAt: 8, duration: 2, audioFile: "/audio/4.mp3" },
      ],
    },
    presentationStyle: { ...script, audioParams: { ...script.audioParams, introPadding: 1, outroPadding: 1 } },
  }) as unknown as MulmoStudioContext;

test("planAvatarTracks: one track per speaker with an avatar, at the narration's absolute times", () => {
  const plans = planAvatarTracks(createContext("ja"));
  assert.strictEqual(plans.length, 1);
  const [miko] = plans;
  assert.strictEqual(miko.speakerId, "Miko");
  assert.strictEqual(miko.source, "/scripts/avatars/miko");
  // narration starts at startAt + introPadding; the narrator's beat and the empty beat are not in the track
  assert.deepStrictEqual(
    miko.segments.map((s) => [s.beatIndex, s.start, s.text, s.audio]),
    [
      [0, 1, "こんにちは！", "/audio/0.mp3"],
      [4, 9, "また会いましょう。", "/audio/4.mp3"],
    ],
  );
  assert.deepStrictEqual(miko.segments[0].motions, [{ motion: "nod", at: "こんにちは" }]);
  assert.strictEqual(miko.segments[0].emotion, "happy");
  // the whole video: beat durations plus intro and outro padding
  assert.strictEqual(miko.duration, 12);
  // beat stretches start at 0, 3, 6, 8, 9 (narration start; the first one at 0 with its intro).
  // Position: defaults < script < speaker avatar < beat. A beat's own position holds for that beat;
  // the narrator's beat keeps Miko where she was; the hidden beat (6–8) is not shown; equal
  // neighbouring stretches are joined.
  assert.deepStrictEqual(miko.placements, [
    { start: 0, end: 6, position: { x: "80%", y: "95%", scale: "50%" } },
    { start: 8, end: 12, position: { x: "80%", y: "100%", scale: "50%" } },
  ]);
});

test("planAvatarTracks: a language override of the speaker keeps the avatar", () => {
  assert.strictEqual(planAvatarTracks(createContext("en"))[0]?.speakerId, "Miko");
});

test("addAvatars: overlays each track last, decoding alpha, at each stretch's place and size", () => {
  const context = createContext("ja");
  context.studio.avatarTracks = [
    {
      speaker: "Miko",
      file: "/out/avatar.webm",
      width: 600,
      height: 600,
      placements: [
        { start: 0, end: 6, x: 900, y: 300, width: 300, height: 300 },
        { start: 8, end: 12, x: 100, y: 120, width: 600, height: 600 },
      ],
    },
  ];
  const ffmpegContext = FfmpegContextInit();
  const videoId = addAvatars(ffmpegContext, "base", context);
  assert.strictEqual(videoId, "avatar0_1");
  assert.deepStrictEqual(ffmpegContext.filterComplex, [
    "[0:v]split=2[avatar0_src0][avatar0_src1]",
    "[avatar0_src0]scale=300:300[avatar0_0s]",
    "[base][avatar0_0s]overlay=x=900:y=300:format=auto:eof_action=pass:enable='gte(t,0)*lt(t,6)'[avatar0_0]",
    "[avatar0_0][avatar0_src1]overlay=x=100:y=120:format=auto:eof_action=pass:enable='gte(t,8)*lt(t,12)'[avatar0_1]",
  ]);
  assert.deepStrictEqual(ffmpegContext.command._inputs[0].options.get(), ["-c:v", "libvpx-vp9"]);
});

test("addAvatars: a track shown in one stretch at its own size needs no split or scale", () => {
  const context = createContext("ja");
  context.studio.avatarTracks = [
    { speaker: "Miko", file: "/out/avatar.webm", width: 446, height: 446, placements: [{ start: 0, end: 12, x: 852, y: 274, width: 446, height: 446 }] },
  ];
  const ffmpegContext = FfmpegContextInit();
  addAvatars(ffmpegContext, "base", context);
  assert.deepStrictEqual(ffmpegContext.filterComplex, ["[base][0:v]overlay=x=852:y=274:format=auto:eof_action=pass:enable='gte(t,0)*lt(t,12)'[avatar0_0]"]);
});

test("addAvatars: no tracks, no filter", () => {
  const ffmpegContext = FfmpegContextInit();
  assert.strictEqual(addAvatars(ffmpegContext, "base", createContext("ja")), "base");
  assert.deepStrictEqual(ffmpegContext.filterComplex, []);
});

test("schema: avatar fields are optional and checked", () => {
  const base = { $mulmocast: { version: "1.1" }, beats: [{ text: "hi" }] };
  assert.ok(mulmoScriptSchema.safeParse(base).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, avatarParams: { position: { x: "left" } } }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, beats: [{ text: "hi", avatarParams: { emotion: "bored" } }] }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, speechParams: { speakers: { A: { voiceId: "x", avatar: { source: "a", size: 1 } } } } }).success);
});
