// Gemini 3.8 TTS takes the Interactions API: the text is read verbatim, so speaker direction goes in a
// speech_metadata annotation instead of the prompt, and raw PCM must be asked for (the unary default is WAV).
export const GEMINI_INTERACTIONS_TTS_MODELS: ReadonlySet<string> = new Set(["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"]);

export const GEMINI_TTS_SAMPLE_RATE = 24000;

export const usesGeminiInteractionsTts = (model: string): boolean => GEMINI_INTERACTIONS_TTS_MODELS.has(model);

export type GeminiInteractionsTtsInput = { model: string; text: string; voice: string; instructions?: string };

export const buildGeminiInteractionsTtsRequest = ({ model, text, voice, instructions }: GeminiInteractionsTtsInput) => ({
  model,
  input: [
    {
      type: "user_input" as const,
      content: [{ type: "text" as const, text, ...(instructions ? { annotations: [{ type: "speech_metadata" as const, style: instructions }] } : {}) }],
    },
  ],
  response_format: { type: "audio" as const, mime_type: "audio/l16", sample_rate: GEMINI_TTS_SAMPLE_RATE },
  generation_config: { speech_config: [{ voice }] },
});

type InteractionAudio = { data?: string; mime_type?: string; sample_rate?: number };

const sampleRateOf = (audio: InteractionAudio) => {
  if (typeof audio.sample_rate === "number" && audio.sample_rate > 0) return audio.sample_rate;
  const match = audio.mime_type?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : GEMINI_TTS_SAMPLE_RATE;
};

// Anything but headerless 16-bit PCM would be fed to the PCM encoder as noise, so it is an error, not a guess.
export const pcmFromInteractionAudio = (audio: InteractionAudio | undefined): { rawPcm: Buffer; sampleRate: number } => {
  if (!audio?.data) throw new Error("No audio data returned");
  if (!audio.mime_type?.toLowerCase().startsWith("audio/l16")) {
    throw new Error(`Gemini TTS returned ${audio.mime_type ?? "audio of an unknown type"}, expected audio/l16`);
  }
  return { rawPcm: Buffer.from(audio.data, "base64"), sampleRate: sampleRateOf(audio) };
};
