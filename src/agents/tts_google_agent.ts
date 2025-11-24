import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import * as textToSpeech from "@google-cloud/text-to-speech";
import { apiKeyMissingError, agentGenerationError, audioAction, audioFileTarget } from "../utils/error_cause.js";

import type { GoogleTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, AgentConfig } from "../types/agent.js";

export const ttsGoogleAgent: AgentFunction<
  GoogleTTSAgentParams,
  AgentBufferResult | AgentErrorResult,
  AgentTextInputs,
  AgentConfig
> = async ({ namedInputs, params, config }) => {
  const { text } = namedInputs;
  const { voice, suppressError, speed } = params;
  const { apiKey } = config ?? {};

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required", {
      cause: apiKeyMissingError("ttsGoogleAgent", audioAction, "GEMINI_API_KEY"),
    });
  }

  // Construct the voice request
  const voiceParams: textToSpeech.protos.google.cloud.texttospeech.v1.IVoiceSelectionParams = {
    languageCode: "en-US", // TODO: Make this configurable
    ssmlGender: "FEMALE", // TODO: Make this configurable
  };

  if (voice) {
    voiceParams.name = voice;
  }

  // Construct the request
  const request: textToSpeech.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },
    voice: voiceParams,
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: speed || 1.0,
    },
  };
  try {
    const client = new textToSpeech.TextToSpeechClient({
      fallback: true,
      apiKey,
    });
    // Call the Text-to-Speech API
    const [response] = await client.synthesizeSpeech(request);
    return { buffer: response.audioContent as Buffer };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);
    throw new Error("TTS Google Error", {
      cause: agentGenerationError("ttsGoogleAgent", audioAction, audioFileTarget),
    });
  }
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
