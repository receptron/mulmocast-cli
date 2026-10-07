import test from "node:test";
import assert from "node:assert";
import {
  GEMINI_INTERACTIONS_TTS_MODELS,
  GEMINI_TTS_SAMPLE_RATE,
  buildGeminiInteractionsTtsRequest,
  pcmFromInteractionAudio,
  usesGeminiInteractionsTts,
} from "../../src/utils/gemini_tts.js";
import { provider2TTSAgent } from "../../src/types/provider2agent.js";

test("usesGeminiInteractionsTts: only the 3.8 TTS models; 2.5 keeps generateContent", () => {
  assert.strictEqual(usesGeminiInteractionsTts("gemini-3.8-flash-tts"), true);
  assert.strictEqual(usesGeminiInteractionsTts("gemini-3.8-flash-lite-tts"), true);
  ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts", "gemini-3.8-flash", "gemini-3.8-flash-tts-preview", ""].forEach((model) =>
    assert.strictEqual(usesGeminiInteractionsTts(model), false, model),
  );
  GEMINI_INTERACTIONS_TTS_MODELS.forEach((model) => assert.ok(provider2TTSAgent.gemini.models.includes(model), `${model} is selectable`));
});

test("buildGeminiInteractionsTtsRequest: the text is sent verbatim and direction goes to speech_metadata, not into the text", () => {
  const request = buildGeminiInteractionsTtsRequest({ model: "gemini-3.8-flash-tts", text: "Hello.", voice: "Kore", instructions: "whispering" });
  assert.deepStrictEqual(request.input, [
    { type: "user_input", content: [{ type: "text", text: "Hello.", annotations: [{ type: "speech_metadata", style: "whispering" }] }] },
  ]);
  assert.deepStrictEqual(request.response_format, { type: "audio", mime_type: "audio/l16", sample_rate: GEMINI_TTS_SAMPLE_RATE });
  assert.deepStrictEqual(request.generation_config, { speech_config: [{ voice: "Kore" }] });
  assert.strictEqual(request.model, "gemini-3.8-flash-tts");
});

test("buildGeminiInteractionsTtsRequest: no direction means no annotation", () => {
  ["", undefined].forEach((instructions) => {
    const request = buildGeminiInteractionsTtsRequest({ model: "gemini-3.8-flash-tts", text: "Hi", voice: "Kore", instructions });
    assert.deepStrictEqual(request.input[0].content, [{ type: "text", text: "Hi" }]);
  });
});

test("pcmFromInteractionAudio: raw PCM with the rate from sample_rate, or from the mime type", () => {
  const data = Buffer.from([1, 2, 3, 4]).toString("base64");
  assert.deepStrictEqual(pcmFromInteractionAudio({ data, mime_type: "audio/l16; rate=24000; channels=1", sample_rate: 22050 }), {
    rawPcm: Buffer.from([1, 2, 3, 4]),
    sampleRate: 22050,
  });
  assert.strictEqual(pcmFromInteractionAudio({ data, mime_type: "audio/L16;rate=16000" }).sampleRate, 16000);
  assert.strictEqual(pcmFromInteractionAudio({ data, mime_type: "audio/l16" }).sampleRate, GEMINI_TTS_SAMPLE_RATE);
});

test("pcmFromInteractionAudio: WAV, other encodings and missing audio are errors, never fed to the PCM encoder", () => {
  const data = Buffer.from("RIFF....WAVE").toString("base64");
  assert.throws(() => pcmFromInteractionAudio({ data, mime_type: "audio/wav" }), /audio\/wav, expected audio\/l16/);
  assert.throws(() => pcmFromInteractionAudio({ data, mime_type: "audio/mulaw" }), /expected audio\/l16/);
  assert.throws(() => pcmFromInteractionAudio({ data }), /unknown type/);
  assert.throws(() => pcmFromInteractionAudio({ mime_type: "audio/l16" }), /No audio data/);
  assert.throws(() => pcmFromInteractionAudio(undefined), /No audio data/);
});
