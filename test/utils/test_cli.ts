import test from "node:test";
import assert from "node:assert";

import { getFileObject } from "../../src/cli/helpers.js";
import { createStudioData } from "../../src/utils/context.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("test getFileObject", async () => {
  const ret = getFileObject({ file: "hello.yaml" });
  assert.deepStrictEqual(ret, {
    baseDirPath: path.resolve(__dirname, "../../"),
    mulmoFilePath: path.resolve(__dirname, "../../hello.yaml"),
    mulmoFileDirPath: path.resolve(__dirname, "../../"),
    outDirPath: path.resolve(__dirname, "../../output/"),
    imageDirPath: path.resolve(__dirname, "../../output/images"),
    audioDirPath: path.resolve(__dirname, "../../output/audio"),
    outputStudioFilePath: path.resolve(__dirname, "../../output/hello_studio.json"),
    nodeModuleRootPath: undefined,
    isHttpPath: false,
    fileName: "hello",
    fileOrUrl: "hello.yaml",
    presentationStylePath: undefined,
    outputMultilingualFilePath: path.resolve(__dirname, "../../output/hello_lang.json"),
  });
});

test("test createStudioData", async () => {
  const studio = createStudioData(
    {
      $mulmocast: {
        version: "1.1",
        credit: "closing",
      },
      lang: "en",
      beats: [{ text: "hello" }],
    },
    "",
  );
  // console.log(JSON.stringify(ret));
  const expect = {
    script: {
      $mulmocast: { version: "1.1", credit: "closing" },
      lang: "en",
      canvasSize: { width: 1280, height: 720 },
      speechParams: { speakers: { Presenter: { displayName: { en: "Presenter" }, voiceId: "shimmer" } } },
      soundEffectParams: {
        provider: "replicate",
      },
      audioParams: {
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
        bgmVolume: 0.2,
        audioVolume: 1.0,
      },
      imageParams: {
        images: {},
        provider: "openai",
      },
      movieParams: {
        provider: "replicate",
      },
      beats: [
        { text: "hello" },
        {
          id: "mulmo_credit",
          speaker: "Presenter",
          text: "",
          image: {
            type: "image",
            source: { kind: "url", url: "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/images/mulmocast_credit.png" },
          },
          audio: { type: "audio", source: { kind: "url", url: "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/audio/silent300.mp3" } },
        },
      ],
    },
    filename: "",
    beats: [{}, {}],
  };
  assert.deepStrictEqual(studio, expect);
});

test("test createStudioData", async () => {
  const studio = createStudioData(
    {
      $mulmocast: {
        version: "1.1",
        credit: "closing",
      },
      lang: "en",
      speechParams: { speakers: { Test: { displayName: { en: "Test" }, voiceId: "shimmer" } } },
      beats: [{ text: "hello" }],
    },
    "",
  );
  // console.log(JSON.stringify(ret));
  const expect = {
    script: {
      $mulmocast: { version: "1.1", credit: "closing" },
      lang: "en",
      canvasSize: { width: 1280, height: 720 },
      speechParams: { speakers: { Test: { displayName: { en: "Test" }, voiceId: "shimmer" } } },
      soundEffectParams: {
        provider: "replicate",
      },
      audioParams: {
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
        bgmVolume: 0.2,
        audioVolume: 1.0,
      },
      imageParams: {
        images: {},
        provider: "openai",
      },
      movieParams: {
        provider: "replicate",
      },
      beats: [
        { text: "hello" },
        {
          id: "mulmo_credit",
          speaker: "Test",
          text: "",
          image: {
            type: "image",
            source: { kind: "url", url: "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/images/mulmocast_credit.png" },
          },
          audio: { type: "audio", source: { kind: "url", url: "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/audio/silent300.mp3" } },
        },
      ],
    },
    filename: "",
    beats: [{}, {}],
  };
  assert.deepStrictEqual(studio, expect);
});
