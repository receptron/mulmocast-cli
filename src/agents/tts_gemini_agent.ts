import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { GoogleGenAI } from "@google/genai";

import { agentGenerationError, audioAction, audioFileTarget } from "../utils/error_cause.js";
import { pcmToMp3 } from "../utils/ffmpeg_utils.js";

import type { GoogleTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult } from "../types/agent.js";

export const ttsGeminiAgent: AgentFunction<GoogleTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs> = async ({ namedInputs, params }) => {
  const { text } = namedInputs;
  const { voice, suppressError } = params;

  try {
    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Kore" },
          },
        },
      },
    });

    const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as any;

    if (!pcmBase64) throw new Error("No audio data returned");

    const rawPcm = Buffer.from(pcmBase64, "base64");

    return { buffer: await pcmToMp3(rawPcm) };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);
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
