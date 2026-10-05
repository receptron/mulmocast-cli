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
  assert.deepStrictEqual(miko.hidden, [[6, 8]]);
  // the whole video: beat durations plus intro and outro padding
  assert.strictEqual(miko.duration, 12);
  // defaults < script < speaker avatar < first beat
  assert.deepStrictEqual(miko.position, { x: "80%", y: "95%", scale: "50%" });
});

test("planAvatarTracks: a language override of the speaker keeps the avatar", () => {
  assert.strictEqual(planAvatarTracks(createContext("en"))[0]?.speakerId, "Miko");
});

test("addAvatars: overlays each track last, decoding alpha, off during hidden beats", () => {
  const context = createContext("ja");
  context.studio.avatarTracks = [{ speaker: "Miko", file: "/out/avatar.webm", x: 835, y: 274, width: 480, height: 446, hidden: [[6, 8]] }];
  const ffmpegContext = FfmpegContextInit();
  const videoId = addAvatars(ffmpegContext, "base", context);
  assert.strictEqual(videoId, "avatar0");
  assert.deepStrictEqual(ffmpegContext.filterComplex, ["[base][0:v]overlay=x=835:y=274:format=auto:eof_action=pass:enable='not(between(t,6,8))'[avatar0]"]);
  assert.deepStrictEqual(ffmpegContext.command._inputs[0].options.get(), ["-c:v", "libvpx-vp9"]);
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
