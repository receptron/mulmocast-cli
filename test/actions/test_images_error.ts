import test from "node:test";
import assert from "node:assert";
import { GraphAILogger } from "graphai";

import { getFileObject } from "../../src/cli/helpers.js";
import { createStudioData } from "../../src/utils/context.js";
import { images } from "../../src/actions/images.js";
import { addSessionProgressCallback } from "../../src/methods/mulmo_studio_context.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getContext = () => {
  const fileDirs = getFileObject({ file: "hello.yaml" });
  const mulmoScript = {
    $mulmocast: {
      version: "1.1",
    },
    canvasSize: {
      width: 1280,
      height: 720,
    },
    speechParams: {
      speakers: {
        Presenter: {
          displayName: {
            en: "Presenter",
          },
          voiceId: "shimmer",
        },
      },
    },
    imageParams: {
      provider: "openai",
      images: {},
    },
    soundEffectParams: {
      provider: "replicate",
    },
    audioParams: {
      padding: 0.3,
      introPadding: 1,
      closingPadding: 0.8,
      outroPadding: 1,
      bgmVolume: 0.2,
      audioVolume: 1,
      suppressSpeech: false,
    },
    title: "(無題)",
    description: "mulmocast",
    lang: "en",
    beats: [
      {
        speaker: "Presenter",
        text: "",
        id: "a7105c4e-8614-4028-9ea6-3492a1f55d6d",
        image: {
          type: "image",
          source: {
            kind: "path",
            path: ".",
          },
        },
      },
    ],
  };

  const studio = createStudioData(mulmoScript, "hello");
  const context = {
    studio,
    fileDirs,
    force: false,
    sessionState: {
      inSession: {
        audio: false,
        image: false,
        video: false,
        multiLingual: false,
        caption: false,
        pdf: false,
      },
      inBeatSession: {
        audio: {},
        image: {},
        movie: {},
        multiLingual: {},
        caption: {},
        html: {},
      },
    },
    presentationStyle: studio.script,
  };
  return context;
};

test("test images", async () => {
  // const fileDirs = getFileObject({ file: "hello.yaml", basedir: __dirname });
  addSessionProgressCallback((data) => {
    GraphAILogger.info(data);
  });

  const context = getContext();

  await assert.rejects(
    async () => {
      await images(context);
    },
    { name: "Error" },
  );
});
