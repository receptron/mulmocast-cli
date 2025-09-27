import test from "node:test";
import assert from "node:assert";
import { mulmoScriptSchema } from "../../src/types/schema.js";

test("test zod", async () => {
  const initMulmoScript = {
    title: "title",
    description: "INITIAL_DESCRIPTION",
    $mulmocast: {
      version: "1.1",
      credit: "closing",
    },
    lang: "en",
    beats: [
      {
        speaker: "Presenter",
        text: "",
        imagePrompt: "",
      },
    ],
  };
  const data = mulmoScriptSchema.safeParse(initMulmoScript);
  console.log(JSON.stringify(data));
  const expected = {
    success: true,
    data: {
      $mulmocast: { version: "1.1", credit: "closing" },
      canvasSize: { width: 1280, height: 720 },
      speechParams: { speakers: { Presenter: { displayName: { en: "Presenter" }, voiceId: "shimmer", provider: "openai" } } },
      imageParams: { provider: "openai", images: {} },
      soundEffectParams: { provider: "replicate" },
      audioParams: { padding: 0.3, introPadding: 1, closingPadding: 0.8, outroPadding: 1, bgmVolume: 0.2, audioVolume: 1, suppressSpeech: false },
      title: "title",
      description: "INITIAL_DESCRIPTION",
      lang: "en",
      beats: [{ speaker: "Presenter", text: "", imagePrompt: "" }],
    },
  };
  assert.deepStrictEqual(expected, data);
});
