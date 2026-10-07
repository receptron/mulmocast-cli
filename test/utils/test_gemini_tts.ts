import test from "node:test";
import assert from "node:assert";
import {
  GEMINI_INTERACTIONS_TTS_MODELS,
  GEMINI_TTS_SAMPLE_RATE,
  buildGeminiInteractionsTtsRequest,
  geminiDirectorsNotesPrompt,
  geminiTtsInputText,
  pcmFromInteractionAudio,
  usesGeminiInteractionsTts,
} from "../../src/utils/gemini_tts.js";
import { provider2TTSAgent } from "../../src/types/provider2agent.js";
import { generateGeminiTts, type GeminiTtsClient } from "../../src/agents/tts_gemini_agent.js";

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

test("geminiDirectorsNotesPrompt: the same text the 2.5 path always sent", () => {
  const legacy = (text: string, instructions?: string) => (instructions ? `### DIRECTOR'S NOTES\n${instructions}\n\n#### TRANSCRIPT\n${text}` : text);
  [
    ["Hello.", "whispering"],
    ["こんにちは", undefined],
    ["a\nb", "slow\nand calm"],
    ["", "x"],
    ["x", ""],
  ].forEach(([text, instructions]) => assert.strictEqual(geminiDirectorsNotesPrompt(text ?? "", instructions), legacy(text ?? "", instructions)));
});

test("geminiTtsInputText: 3.8 counts the transcript and the style, 2.5 the wrapped prompt", () => {
  assert.strictEqual(geminiTtsInputText("gemini-3.8-flash-tts", "Hello.", "whispering"), "Hello.\nwhispering");
  assert.strictEqual(geminiTtsInputText("gemini-3.8-flash-tts", "Hello."), "Hello.");
  assert.strictEqual(geminiTtsInputText("gemini-2.5-flash-preview-tts", "Hello.", "whispering"), geminiDirectorsNotesPrompt("Hello.", "whispering"));
});

const fakeClient = () => {
  const calls: { api: string; params: unknown; options?: { timeout?: number } }[] = [];
  const pcm = Buffer.from([0, 1, 2, 3]).toString("base64");
  const client: GeminiTtsClient = {
    models: {
      generateContent: async (params) => {
        calls.push({ api: "generateContent", params });
        return {
          candidates: [{ content: { parts: [{ inlineData: { data: pcm, mimeType: "audio/L16;codec=pcm;rate=24000" } }] } }],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5, totalTokenCount: 8 },
        };
      },
    },
    interactions: {
      create: async (params, options) => {
        calls.push({ api: "interactions", params, options });
        return {
          output_audio: { data: pcm, mime_type: "audio/l16; rate=24000; channels=1", sample_rate: 24000 },
          usage: { total_input_tokens: 7, total_output_tokens: 11, total_tokens: 18 },
        };
      },
    },
  };
  return { client, calls };
};

test("generateGeminiTts: 3.8 goes to the Interactions API with the built request, a timeout, and its usage", async () => {
  const { client, calls } = fakeClient();
  const input = { model: "gemini-3.8-flash-tts", text: "Hello.", voice: "Kore", instructions: "whispering" };
  const result = await generateGeminiTts(client, input);
  assert.deepStrictEqual(
    calls.map((call) => call.api),
    ["interactions"],
  );
  assert.deepStrictEqual(calls[0].params, buildGeminiInteractionsTtsRequest(input));
  assert.ok(typeof calls[0].options?.timeout === "number");
  assert.deepStrictEqual(result.rawPcm, Buffer.from([0, 1, 2, 3]));
  assert.strictEqual(result.sampleRate, 24000);
  assert.deepStrictEqual(result.usage, { provider: "gemini", model: "gemini-3.8-flash-tts", inputTokens: 7, outputTokens: 11, totalTokens: 18 });
});

test("generateGeminiTts: 2.5 keeps generateContent with the direction in the prompt", async () => {
  const { client, calls } = fakeClient();
  const result = await generateGeminiTts(client, { model: "gemini-2.5-flash-preview-tts", text: "Hello.", voice: "Kore", instructions: "whispering" });
  assert.deepStrictEqual(
    calls.map((call) => call.api),
    ["generateContent"],
  );
  assert.deepStrictEqual(calls[0].params, {
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: geminiDirectorsNotesPrompt("Hello.", "whispering") }] }],
    config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
  });
  assert.deepStrictEqual(result.usage, { provider: "gemini", model: "gemini-2.5-flash-preview-tts", inputTokens: 3, outputTokens: 5, totalTokens: 8 });
});

test("generateGeminiTts: the default Gemini TTS model takes the Interactions API", async () => {
  const { client, calls } = fakeClient();
  await generateGeminiTts(client, { model: provider2TTSAgent.gemini.defaultModel, text: "Hi", voice: provider2TTSAgent.gemini.defaultVoice });
  assert.strictEqual(calls[0].api, "interactions");
});
