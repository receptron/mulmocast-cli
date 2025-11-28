import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { provider2TTSAgent } from "../utils/provider2agent.js";
import { apiKeyMissingError, agentIncorrectAPIKeyError, agentGenerationError, audioAction, audioFileTarget } from "../utils/error_cause.js";
import type { KotodamaTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, AgentConfig } from "../types/agent.js";

export const ttsKotodamaAgent: AgentFunction<KotodamaTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs, AgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { text } = namedInputs;
  const { voice, decoration, suppressError } = params;
  const { apiKey } = config ?? {};

  if (!apiKey) {
    throw new Error("Kotodama API key is required (KOTODAMA_API_KEY)", {
      cause: apiKeyMissingError("ttsKotodamaAgent", audioAction, "KOTODAMA_API_KEY"),
    });
  }

  const url = "https://tts3.spiral-ai-app.com/api/tts_generate";
  const body: Record<string, string> = {
    text,
    speaker_id: voice ?? provider2TTSAgent.kotodama.defaultVoice,
    decoration_id: decoration ?? provider2TTSAgent.kotodama.defaultDecoration,
    audio_format: "mp3",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Failed to generate audio: 401 Incorrect API key provided with Kotodama", {
          cause: agentIncorrectAPIKeyError("ttsKotodamaAgent", audioAction, audioFileTarget),
        });
      }

      throw new Error(`Kotodama API error: ${response.status} ${response.statusText}`, {
        cause: agentGenerationError("ttsKotodamaAgent", audioAction, audioFileTarget),
      });
    }

    // Response is JSON with base64-encoded audio in "audios" array
    const json = await response.json();
    if (!json.audios || !json.audios[0]) {
      throw new Error("TTS Kotodama Error: No audio data in response", {
        cause: agentGenerationError("ttsKotodamaAgent", audioAction, audioFileTarget),
      });
    }

    const buffer = Buffer.from(json.audios[0], "base64");
    return { buffer };
  } catch (error) {
    if (suppressError) {
      return {
        error,
      };
    }
    GraphAILogger.error(error);

    if (error && typeof error === "object" && "cause" in error) {
      throw error;
    }

    throw new Error("TTS Kotodama Error", {
      cause: agentGenerationError("ttsKotodamaAgent", audioAction, audioFileTarget),
    });
  }
};

const ttsKotodamaAgentInfo: AgentFunctionInfo = {
  name: "ttsKotodamaAgent",
  agent: ttsKotodamaAgent,
  mock: ttsKotodamaAgent,
  samples: [],
  description: "Kotodama TTS agent (SpiralAI)",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli",
  license: "MIT",
  environmentVariables: ["KOTODAMA_API_KEY"],
};

export default ttsKotodamaAgentInfo;
