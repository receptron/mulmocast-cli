import test from "node:test";
import assert from "node:assert";

import { getFileObject } from "../../src/cli/helpers.js";
import { createOrUpdateStudioData } from "../../src/utils/preprocess.js";

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
    isHttpPath: false,
    fileName: "hello",
    fileOrUrl: "hello.yaml",
    presentationStylePath: undefined,
    outputMultilingualFilePath: path.resolve(__dirname, "../../output/hello_lang.json"),
  });
});

test("test createOrUpdateStudioData", async () => {
  const studio = createOrUpdateStudioData(
    {
      $mulmocast: {
        version: "1.0",
        credit: "closing",
      },
      beats: [{ text: "hello" }],
    },
    null,
    "",
  );
  // console.log(JSON.stringify(ret));
  const expect = {
    script: {
      $mulmocast: { version: "1.0", credit: "closing" },
      canvasSize: { width: 1280, height: 720 },
      speechParams: { provider: "openai", speakers: { Presenter: { displayName: { en: "Presenter" }, voiceId: "shimmer", provider: "openai" } } },
      audioParams: {
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
        bgmVolume: 0.2,
        audioVolume: 1.0,
      },
      beats: [
        { speaker: "Presenter", text: "hello" },
        {
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
