import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { GoogleGenAI } from "@google/genai";

import { provider2TTSAgent } from "../utils/provider2agent.js";
import {
  agentIncorrectAPIKeyError,
  apiKeyMissingError,
  agentGenerationError,
  audioAction,
  audioFileTarget,
  getGenAIErrorReason,
} from "../utils/error_cause.js";
import { pcmToMp3 } from "../utils/ffmpeg_utils.js";

import type { GoogleTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult } from "../types/agent.js";

const getPrompt = (text: string, instructions?: string) => {
  // https://ai.google.dev/gemini-api/docs/speech-generation?hl=ja#controllable
  if (instructions) {
    return `### DIRECTOR'S NOTES\n${instructions}\n\n#### TRANSCRIPT\n${text}`;
  }
  return text;
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

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model ?? provider2TTSAgent.gemini.defaultModel,
      contents: [{ parts: [{ text: getPrompt(text, instructions) }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice ?? provider2TTSAgent.gemini.defaultVoice },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const pcmBase64 = inlineData?.data;
    const mimeType = inlineData?.mimeType;

    if (!pcmBase64 || typeof pcmBase64 !== "string") throw new Error("No audio data returned");

    // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
    const rateMatch = mimeType?.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

    const rawPcm = Buffer.from(pcmBase64, "base64");

    return { buffer: await pcmToMp3(rawPcm, sampleRate) };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);

    const reasonDetail = getGenAIErrorReason(e as Error);
    if (reasonDetail && reasonDetail.reason && reasonDetail.reason === "API_KEY_INVALID") {
      throw new Error("Failed to generate tts: 400 Incorrect API key provided with gemini", {
        cause: agentIncorrectAPIKeyError("ttsGeminiAgent", audioAction, audioFileTarget),
      });
    }
    throw new Error("TTS Gemini Error", {
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
