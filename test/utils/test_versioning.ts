import test from "node:test";
import assert from "node:assert";
import { MulmoScriptMethods } from "../../src/methods/index.js";

const script_10 = {
  $mulmocast: {
    version: "1.0",
    credit: "closing",
  },
  soundEffectParams: {
    provider: "replicate",
  },
  speechParams: {
    provider: "nijivoice", // this is not in the 1.1 schema
    speakers: {
      speaker1: {
        voiceId: "voice-123",
      },
      speaker2: {
        voiceId: "voice-456",
      },
      speaker3: {
        provider: "openai",
        voiceId: "voice-789",
      },
    },
  },
  beats: [
    {
      text: "Hello, world!",
    },
  ],
};

const script_11 = {
  $mulmocast: {
    version: "1.1",
    credit: "closing",
  },
  lang: "en",
  canvasSize: {
    height: 720,
    width: 1280,
  },
  imageParams: {
    images: {},
    provider: "openai",
  },
  audioParams: {
    audioVolume: 1,
    bgmVolume: 0.2,
    closingPadding: 0.8,
    introPadding: 1,
    outroPadding: 1,
    padding: 0.3,
    suppressSpeech: false,
  },
  movieParams: { provider: "replicate" },
  soundEffectParams: {
    provider: "replicate",
  },
  speechParams: {
    speakers: {
      speaker1: {
        provider: "nijivoice",
        voiceId: "voice-123",
      },
      speaker2: {
        provider: "nijivoice",
        voiceId: "voice-456",
      },
      speaker3: {
        provider: "openai",
        voiceId: "voice-789",
      },
    },
  },
  beats: [
    {
      text: "Hello, world!",
    },
  ],
};

test("validating versioning from 1.0", async () => {
  const validated = MulmoScriptMethods.validate(script_10);
  assert.deepStrictEqual(validated, script_11);
});

test("validating versioning from 1.1", async () => {
  const validated = MulmoScriptMethods.validate({ ...script_10, lang: "ja" });
  assert.deepStrictEqual(validated, { ...script_11, lang: "ja" });
});
