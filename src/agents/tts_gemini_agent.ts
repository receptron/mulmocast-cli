import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { GoogleGenAI } from "@google/genai";

import { provider2TTSAgent } from "../types/provider2agent.js";
import {
  agentIncorrectAPIKeyError,
  apiKeyMissingError,
  agentGenerationError,
  audioAction,
  audioFileTarget,
  getGenAIErrorReason,
} from "../utils/error_cause.js";
import { pcmToMp3 } from "../utils/ffmpeg_utils.js";
import {
  GEMINI_TTS_SAMPLE_RATE,
  buildGeminiInteractionsTtsRequest,
  pcmFromInteractionAudio,
  usesGeminiInteractionsTts,
  type GeminiInteractionsTtsInput,
} from "../utils/gemini_tts.js";

// Per-request timeout so a stalled GenAI TTS call rejects (and GraphAI retry can
// recover) instead of hanging. Generous vs. normal generation time.
const GENAI_REQUEST_TIMEOUT_MS = 120_000;

import type { GoogleTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult } from "../types/agent.js";
import type { AgentUsage } from "../types/usage.js";

const getPrompt = (text: string, instructions?: string) => {
  // https://ai.google.dev/gemini-api/docs/speech-generation?hl=ja#controllable
  if (instructions) {
    return `### DIRECTOR'S NOTES\n${instructions}\n\n#### TRANSCRIPT\n${text}`;
  }
  return text;
};

type GeminiAudio = { rawPcm: Buffer; sampleRate: number; usage: AgentUsage | undefined };

const geminiUsage = (model: string, inputTokens?: number, outputTokens?: number, totalTokens?: number): AgentUsage => ({
  provider: "gemini",
  model,
  inputTokens,
  outputTokens,
  totalTokens,
});

// 2.5 TTS: generateContent, direction embedded in the prompt, headerless PCM with the rate in the mimeType.
const generateWithContent = async (ai: GoogleGenAI, { model, text, voice, instructions }: GeminiInteractionsTtsInput): Promise<GeminiAudio> => {
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: getPrompt(text, instructions) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const pcmBase64 = inlineData?.data;
  if (!pcmBase64 || typeof pcmBase64 !== "string") throw new Error("No audio data returned");
  // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
  const rateMatch = inlineData?.mimeType?.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1]) : GEMINI_TTS_SAMPLE_RATE;
  const metadata = response.usageMetadata;
  return {
    rawPcm: Buffer.from(pcmBase64, "base64"),
    sampleRate,
    usage: metadata ? geminiUsage(model, metadata.promptTokenCount, metadata.candidatesTokenCount, metadata.totalTokenCount) : undefined,
  };
};

const generateWithInteractions = async (ai: GoogleGenAI, input: GeminiInteractionsTtsInput): Promise<GeminiAudio> => {
  const interaction = await ai.interactions.create(buildGeminiInteractionsTtsRequest(input));
  const usage = interaction.usage;
  return {
    ...pcmFromInteractionAudio(interaction.output_audio),
    usage: usage ? geminiUsage(input.model, usage.total_input_tokens, usage.total_output_tokens, usage.total_tokens) : undefined,
  };
};

export const ttsGeminiAgent: AgentFunction<GoogleTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { text } = namedInputs;
  const { model, voice, suppressError, instructions } = params;

  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Google GenAI API key is required (GEMINI_API_KEY)", {
      cause: apiKeyMissingError("ttsGeminiAgent", audioAction, "GEMINI_API_KEY"),
    });
  }

  const geminiResult: GeminiAudio | AgentErrorResult = await (async () => {
    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_REQUEST_TIMEOUT_MS } });
      const request = { model: model ?? provider2TTSAgent.gemini.defaultModel, text, voice: voice ?? provider2TTSAgent.gemini.defaultVoice, instructions };
      return usesGeminiInteractionsTts(request.model) ? await generateWithInteractions(ai, request) : await generateWithContent(ai, request);
    } catch (e) {
      if (suppressError) {
        return { error: e };
      }
      GraphAILogger.info(e);

      const reasonDetail = getGenAIErrorReason(e as Error);
      if (reasonDetail && reasonDetail.reason && reasonDetail.reason === "API_KEY_INVALID") {
        throw new Error("Failed to generate tts: 400 Incorrect API key provided with gemini", {
          cause: agentIncorrectAPIKeyError("ttsGeminiAgent", audioAction, audioFileTarget),
        });
      }
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`TTS Gemini Error: ${detail}`, {
        cause: agentGenerationError("ttsGeminiAgent", audioAction, audioFileTarget),
      });
    }
  })();

  if ("error" in geminiResult) {
    return geminiResult;
  }

  try {
    return { buffer: await pcmToMp3(geminiResult.rawPcm, geminiResult.sampleRate), usage: geminiResult.usage };
  } catch (e) {
    if (suppressError) {
      return { error: e };
    }
    GraphAILogger.info(e);
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Audio encoding (ffmpeg) failed: ${detail}`, {
      cause: agentGenerationError("ttsGeminiAgent", audioAction, audioFileTarget),
    });
  }
};

const ttsGeminiAgentInfo: AgentFunctionInfo = {
  name: "ttsGeminiAgent",
  agent: ttsGeminiAgent,
  mock: ttsGeminiAgent,
  samples: [],
  description: "Google Gemini TTS agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["GEMINI_API_KEY"],
};

export default ttsGeminiAgentInfo;
