import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import type { NijivoiceTTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, AgentConfig } from "../types/agent.js";

type VoiceJson = {
  generatedVoice: {
    audioFileDownloadUrl: string;
  };
};

/*
const errorMessage = [
  "TTS NijiVoice: No API key. ",
  "You have the following options:",
  "1. Obtain an API key from Niji Voice (https://platform.nijivoice.com/) and set it as the NIJIVOICE_API_KEY environment variable.",
  '2. Use OpenAI\'s TTS instead of Niji Voice by changing speechParams.provider from "nijivoice" to "openai".',
].join("\n");
*/

export const ttsNijivoiceAgent: AgentFunction<NijivoiceTTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs, AgentConfig> = async ({
  params,
  namedInputs,
  config,
}) => {
  const { suppressError, voice, speed, speed_global } = params;
  const { apiKey } = config ?? {};
  const { text } = namedInputs;
  if (!apiKey) {
    throw new Error("NijiVoice API key is required (NIJIVOICE_API_KEY)");
  }
  const url = `https://api.nijivoice.com/api/platform/v1/voice-actors/${voice}/generate-voice`;
  const options = {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      format: "mp3",
      speed: String(speed ?? speed_global ?? "1.0"),
      script: text,
    }),
  };

  try {
    const voiceRes = await fetch(url, options);
    const voiceJson: VoiceJson = await voiceRes.json();
    if (voiceJson?.generatedVoice?.audioFileDownloadUrl) {
      const audioRes = await fetch(voiceJson.generatedVoice.audioFileDownloadUrl);
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      return { buffer };
    }
    if (suppressError) {
      return {
        error: voiceJson,
      };
    }
    GraphAILogger.info(voiceJson);
    throw new Error("TTS Nijivoice Error");
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.info(e);
    throw new Error("TTS Nijivoice Error");
  }
};

const ttsNijivoiceAgentInfo: AgentFunctionInfo = {
  name: "ttsNijivoiceAgent",
  agent: ttsNijivoiceAgent,
  mock: ttsNijivoiceAgent,
  samples: [],
  description: "TTS nijivoice agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["NIJIVOICE_API_KEY"],
};

export default ttsNijivoiceAgentInfo;
