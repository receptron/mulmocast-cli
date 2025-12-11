import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { provider2TTSAgent } from "../utils/provider2agent.js";
import {
  apiKeyMissingError,
  agentVoiceLimitReachedError,
  agentIncorrectAPIKeyError,
  agentGenerationError,
  audioAction,
  audioFileTarget,
} from "../utils/error_cause.js";
import type { ElevenlabsTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, AgentConfig } from "../types/agent.js";

export const ttsElevenlabsAgent: AgentFunction<ElevenlabsTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs, AgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { text } = namedInputs;
  const { voice, model, stability, similarityBoost, suppressError } = params;

  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required (ELEVENLABS_API_KEY)", {
      cause: apiKeyMissingError("ttsElevenlabsAgent", audioAction, "ELEVENLABS_API_KEY"),
    });
  }

  if (!voice) {
    throw new Error("ELEVENLABS Voice ID is required", {
      cause: agentGenerationError("ttsElevenlabsAgent", audioAction, audioFileTarget),
    });
  }

  const requestBody = {
    text,
    model_id: model ?? provider2TTSAgent.elevenlabs.defaultModel,
    voice_settings: {
      stability: stability ?? 0.5,
      similarity_boost: similarityBoost ?? 0.75,
    },
  };

  GraphAILogger.log("ElevenLabs TTS options", requestBody);

  const response = await (async () => {
    try {
      return await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      if (suppressError) {
        return {
          error: e,
        };
      }
      GraphAILogger.info(e);
      throw new Error("TTS Eleven Labs Error", {
        cause: agentGenerationError("ttsElevenlabsAgent", audioAction, audioFileTarget),
      });
    }
  })();
  if ("error" in response) {
    return response;
  }
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Failed to generate audio: 401 Incorrect API key provided with ElevenLabs", {
        cause: agentIncorrectAPIKeyError("ttsElevenlabsAgent", audioAction, audioFileTarget),
      });
    }
    const errorDetail = await response.json();
    if (errorDetail.detail.status === "voice_limit_reached") {
      throw new Error("Failed to generate audio: 400 You have reached your maximum amount of custom voices with ElevenLabs", {
        cause: agentVoiceLimitReachedError("ttsElevenlabsAgent", audioAction, audioFileTarget),
      });
    }
    throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`, {
      cause: agentGenerationError("ttsElevenlabsAgent", audioAction, audioFileTarget),
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer };
};

const ttsElevenlabsAgentInfo: AgentFunctionInfo = {
  name: "ttsElevenlabsAgent",
  agent: ttsElevenlabsAgent,
  mock: ttsElevenlabsAgent,
  samples: [],
  description: "Eleven Labs TTS agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["ELEVENLABS_API_KEY"],
};

export default ttsElevenlabsAgentInfo;
