import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import * as textToSpeech from "@google-cloud/text-to-speech";
import type { ServiceError } from "google-gax";
import { agentGenerationError, audioAction, audioFileTarget } from "../utils/error_cause.js";

import type { GoogleTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult } from "../types/agent.js";

const client = new textToSpeech.TextToSpeechClient();

// Hard cap so a hung Google TTS RPC can't pin a beat indefinitely.
// Most synthesizeSpeech calls return in seconds; 60s leaves headroom
// for long inputs and slow regions while still failing loud.
const SYNTHESIZE_TIMEOUT_MS = 60_000;

const getPrompt = (text: string, instructions?: string) => {
  if (instructions) {
    return `### DIRECTOR'S NOTES\n${instructions}\n\n#### TRANSCRIPT\n${text}`;
  }
  return text;
};

export const ttsGoogleAgent: AgentFunction<GoogleTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs> = async ({ namedInputs, params }) => {
  const { text } = namedInputs;
  const { voice, suppressError, speed, model, instructions } = params;
  const useGeminiPrompt = Boolean(model && instructions);

  // Construct the voice request
  const voiceParams: textToSpeech.protos.google.cloud.texttospeech.v1.IVoiceSelectionParams = {
    languageCode: "en-US", // TODO: Make this configurable
    ssmlGender: "FEMALE", // TODO: Make this configurable
  };

  if (voice) {
    voiceParams.name = voice;
  }

  if (model) {
    voiceParams.modelName = model;
  }

  // Construct the request
  const request: textToSpeech.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: {
      text,
      ...(useGeminiPrompt ? { prompt: getPrompt(text, instructions) } : {}),
    },
    voice: voiceParams,
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: speed || 1.0,
    },
  };
  try {
    // Call the Text-to-Speech API
    const [response] = await client.synthesizeSpeech(request, { timeout: SYNTHESIZE_TIMEOUT_MS });
    return { buffer: response.audioContent as Buffer };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);
    // gRPC errors from @google-cloud/text-to-speech are ServiceError
    // (extends Error with a `details` string). Surface that human-readable
    // text so callers don't see only "TTS Google Error".
    throw new Error(`TTS Google Error: ${grpcErrorDetail(e)}`, {
      cause: agentGenerationError("ttsGoogleAgent", audioAction, audioFileTarget),
    });
  }
};

const grpcErrorDetail = (e: unknown): string => {
  if (e instanceof Error) {
    const details = (e as ServiceError).details;
    if (typeof details === "string" && details) return details;
    return e.message;
  }
  return String(e);
};

const ttsGoogleAgentInfo: AgentFunctionInfo = {
  name: "ttsGoogleAgent",
  agent: ttsGoogleAgent,
  mock: ttsGoogleAgent,
  samples: [],
  description: "Google TTS agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["GEMINI_API_KEY"],
};

export default ttsGoogleAgentInfo;
