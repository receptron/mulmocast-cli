import test from "node:test";
import assert from "node:assert";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { avatarUrlStamp, planAvatarTracks } from "../../src/actions/avatar.js";
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
  assert.strictEqual(miko.source, path.resolve("/scripts", "avatars/miko"));
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
  // each stretch is trimmed out of the track and kept at its time, so nothing runs outside it
  assert.deepStrictEqual(ffmpegContext.filterComplex, [
    "[0:v]split=2[avatar0_src0][avatar0_src1]",
    "[avatar0_src0]trim=start=0:end=6,setpts=PTS-STARTPTS+0/TB,scale=300:300[avatar0_0s]",
    "[base][avatar0_0s]overlay=x=900:y=300:format=auto:eof_action=pass:enable='gte(t,0)*lt(t,6)'[avatar0_0]",
    "[avatar0_src1]trim=start=8:end=12,setpts=PTS-STARTPTS+8/TB[avatar0_1s]",
    "[avatar0_0][avatar0_1s]overlay=x=100:y=120:format=auto:eof_action=pass:enable='gte(t,8)*lt(t,12)'[avatar0_1]",
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
  assert.deepStrictEqual(ffmpegContext.filterComplex, [
    "[0:v]trim=start=0:end=12,setpts=PTS-STARTPTS+0/TB[avatar0_0s]",
    "[base][avatar0_0s]overlay=x=852:y=274:format=auto:eof_action=pass:enable='gte(t,0)*lt(t,12)'[avatar0_0]",
  ]);
});

test("addAvatars: no tracks, no filter", () => {
  const ffmpegContext = FfmpegContextInit();
  assert.strictEqual(addAvatars(ffmpegContext, "base", createContext("ja")), "base");
  assert.deepStrictEqual(ffmpegContext.filterComplex, []);
});

test("schema: avatar fields are optional and checked", () => {
  const base = { $mulmocast: { version: "1.1" }, beats: [{ text: "hi" }] };
  assert.ok(mulmoScriptSchema.safeParse(base).success);
  assert.ok(mulmoScriptSchema.safeParse({ ...base, avatarParams: { position: { x: "-12.5%", y: "100%" } } }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, avatarParams: { position: { x: "left" } } }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, avatarParams: { position: { x: "1.2.3%" } } }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, beats: [{ text: "hi", avatarParams: { emotion: "bored" } }] }).success);
  assert.ok(!mulmoScriptSchema.safeParse({ ...base, speechParams: { speakers: { A: { voiceId: "x", avatar: { source: "a", size: 1 } } } } }).success);
});

test("planAvatarTracks: an http(s) avatar source is kept as a URL", () => {
  const url = "https://raw.githubusercontent.com/receptron/mulmocast-media/main/avatars/ani";
  const context = createContext("ja");
  const speakers = context.presentationStyle.speechParams.speakers;
  context.presentationStyle = {
    ...context.presentationStyle,
    speechParams: { ...context.presentationStyle.speechParams, speakers: { ...speakers, Miko: { ...speakers.Miko, avatar: { source: url } } } },
  };
  assert.strictEqual(planAvatarTracks(context)[0]?.source, url);
});

test("avatarUrlStamp: the package's JSON files, the same for the folder and its avatar.json", async () => {
  const files: Record<string, string> = {
    "/ani/avatar.json": JSON.stringify({ root: "pkg", assets: { rig: "rig.json", layers: "built/layers.json", sprites: "built/sprites/sprites.json" } }),
    "/ani/pkg/rig.json": JSON.stringify({ image: { width: 10, height: 10 } }),
    "/ani/pkg/built/layers.json": JSON.stringify({ build: "1", layers: {} }),
  };
  const manifest = files["/ani/avatar.json"];
  const redirects: Record<string, string> = {};
  const queries: string[] = [];
  const server = createServer((req, res) => {
    const [pathname, query = ""] = (req.url ?? "").split("?");
    queries.push(query);
    const redirect = redirects[pathname];
    if (redirect) return void res.writeHead(302, { location: redirect }).end();
    const body = files[pathname];
    if (body === undefined) res.writeHead(404).end();
    else res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ani`;
    const stamp = await avatarUrlStamp(base);
    // no sprites: null, not an error
    assert.deepStrictEqual(stamp, [files["/ani/avatar.json"], files["/ani/pkg/rig.json"], files["/ani/pkg/built/layers.json"], null]);
    assert.deepStrictEqual(await avatarUrlStamp(`${base}/avatar.json`), stamp);
    // a query (a version, a signature) is kept on every file
    queries.length = 0;
    assert.deepStrictEqual(await avatarUrlStamp(`${base}/avatar.json?version=1`), stamp);
    assert.deepStrictEqual(queries, ["version=1", "version=1", "version=1", "version=1"]);
    // a file's own query is kept
    queries.length = 0;
    files["/ani/avatar.json"] = JSON.stringify({ root: "pkg", assets: { rig: "rig.json?token=abc", layers: "built/layers.json" } });
    await avatarUrlStamp(`${base}?version=2`);
    assert.deepStrictEqual(queries, ["version=2", "token=abc", "version=2"]); // no sprites listed: not requested
    files["/ani/avatar.json"] = manifest;
    assert.deepStrictEqual(await avatarUrlStamp(base), stamp);
    // a manifest without sprites: they are not requested (avatarscript does not load them either)
    files["/ani/avatar.json"] = JSON.stringify({ root: "pkg", assets: { rig: "rig.json", layers: "built/layers.json" } });
    queries.length = 0;
    assert.deepStrictEqual((await avatarUrlStamp(base)).slice(1), [files["/ani/pkg/rig.json"], files["/ani/pkg/built/layers.json"], null]);
    assert.strictEqual(queries.length, 3);
    // files outside the package are refused before they are requested
    for (const escape of [{ root: "../other/" }, { assets: { rig: "https://example.com/rig.json" } }, { assets: { layers: "../../x.json" } }]) {
      files["/ani/avatar.json"] = JSON.stringify({ root: "pkg", ...escape });
      queries.length = 0;
      await assert.rejects(avatarUrlStamp(base), /outside the avatar package/);
      assert.deepStrictEqual(queries, [""]); // only avatar.json was requested
    }
    files["/ani/avatar.json"] = manifest;
    // redirects are followed within the same origin only
    // (the manifest moved; its files still resolve against the requested folder)
    redirects["/moved/avatar.json"] = "/ani/avatar.json";
    // (different contents, so the stamp shows which folder each file came from)
    files["/moved/pkg/rig.json"] = JSON.stringify({ image: { width: 1, height: 1 } });
    files["/moved/pkg/built/layers.json"] = JSON.stringify({ build: "moved", layers: {} });
    assert.deepStrictEqual(await avatarUrlStamp(base.replace("/ani", "/moved")), [
      manifest,
      files["/moved/pkg/rig.json"],
      files["/moved/pkg/built/layers.json"],
      null,
    ]);
    redirects["/away/avatar.json"] = "http://localhost:9/avatar.json";
    await assert.rejects(avatarUrlStamp(base.replace("/ani", "/away")), /redirects to another host/);
    // an edited rig or a rebuilt avatar changes the stamp, so its track renders again
    files["/ani/pkg/rig.json"] = JSON.stringify({ image: { width: 10, height: 12 } });
    const edited = await avatarUrlStamp(`${base}/`);
    assert.notDeepStrictEqual(edited, stamp);
    files["/ani/pkg/built/layers.json"] = JSON.stringify({ build: "2", layers: {} });
    assert.notDeepStrictEqual(await avatarUrlStamp(`${base}/`), edited);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
