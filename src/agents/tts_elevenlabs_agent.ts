import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { provider2TTSAgent } from "../utils/provider2agent.js";
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
    throw new Error("ElevenLabs API key is required (ELEVENLABS_API_KEY)");
  }

  if (!voice) {
    throw new Error("ELEVENLABS Voice ID is required");
  }

  try {
    const requestBody = {
      text,
      model_id: model ?? provider2TTSAgent.elevenlabs.defaultModel,
      voice_settings: {
        stability: stability ?? 0.5,
        similarity_boost: similarityBoost ?? 0.75,
      },
    };

    GraphAILogger.log("ElevenLabs TTS options", requestBody);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);
    throw new Error("TTS Eleven Labs Error");
  }
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
