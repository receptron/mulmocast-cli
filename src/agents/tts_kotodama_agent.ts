import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";

export const ttsKotodamaAgent: AgentFunction = async ({ namedInputs, params, config }) => {
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
    speaker_id: voice ?? "Atla",
    decoration_id: decoration ?? "neutral",
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
      const errorText = await response.text();
      if (suppressError) {
        return { error: errorText };
      }
      GraphAILogger.info(`TTS Kotodama Error: ${response.status} ${response.statusText} ${errorText}`);
      throw new Error("TTS Kotodama Error");
    }
    // Response is JSON with base64-encoded audio in "audios" array
    const json = await response.json();
    if (!json.audios || !json.audios[0]) {
      if (suppressError) {
        return { error: "No audio data in response" };
      }
      throw new Error("TTS Kotodama Error: No audio data in response");
    }
    const buffer = Buffer.from(json.audios[0], "base64");
    return { buffer };
  } catch (e) {
    if (suppressError) {
      return { error: e };
    }
    GraphAILogger.info(e);
    throw new Error("TTS Kotodama Error");
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
