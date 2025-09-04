import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import OpenAI from "openai";
import type { SpeechCreateParams } from "openai/resources/audio/speech";
import { provider2TTSAgent } from "../utils/provider2agent.js";
import type { OpenAITTSAgentParams, AgentBufferResult, AgentTextInputs, AgentErrorResult, OpenAIImageAgentConfig } from "../types/agent.js";

export const ttsOpenaiAgent: AgentFunction<OpenAITTSAgentParams, AgentBufferResult | AgentErrorResult, AgentTextInputs, OpenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { text } = namedInputs;
  const { model, voice, suppressError, instructions } = params;
  const { apiKey, baseURL } = config ?? {};
  if (!apiKey) {
    throw new Error("OpenAI API key is required (OPENAI_API_KEY)");
  }
  const openai = new OpenAI({ apiKey, baseURL });

  try {
    const tts_options: SpeechCreateParams = {
      model: model ?? provider2TTSAgent.openai.defaultModel,
      voice: voice ?? provider2TTSAgent.openai.defaultVoice,
      input: text,
    };
    if (instructions) {
      tts_options["instructions"] = instructions;
    }
    GraphAILogger.log("ttsOptions", tts_options);
    const response = await openai.audio.speech.create(tts_options);
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer };
  } catch (e) {
    if (suppressError) {
      return {
        error: e,
      };
    }
    GraphAILogger.error(e);
    if (e && typeof e === "object" && "error" in e) {
      GraphAILogger.info("tts_openai_agent: ");
      GraphAILogger.info(e.error);
      throw new Error("TTS OpenAI Error: " + JSON.stringify(e.error, null, 2));
    } else if (e instanceof Error) {
      GraphAILogger.info("tts_openai_agent: ");
      GraphAILogger.info(e.message);
      throw new Error("TTS OpenAI Error: " + e.message);
    }
  }
};

const ttsOpenaiAgentInfo: AgentFunctionInfo = {
  name: "ttsOpenaiAgent",
  agent: ttsOpenaiAgent,
  mock: ttsOpenaiAgent,
  samples: [],
  description: "OpenAI TTS agent",
  category: ["tts"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["OPENAI_API_KEY"],
};

export default ttsOpenaiAgentInfo;
