import * as crypto from "crypto";
import { MulmoBeat, MulmoStudioMultiLingualData } from "../types/index.js";
import type { ConfigDataDictionary, DefaultConfigData } from "graphai";

export const llm = ["openai", "anthropic", "gemini", "groq"] as const;

export type LLM = (typeof llm)[number];

export const llmConfig: Record<LLM, { agent: string; defaultModel: string; max_tokens: number }> = {
  openai: {
    agent: "openAIAgent",
    defaultModel: "gpt-4o",
    max_tokens: 8192,
  },
  anthropic: {
    agent: "anthropicAgent",
    defaultModel: "claude-3-7-sonnet-20250219",
    max_tokens: 8192,
  },
  gemini: {
    agent: "geminiAgent",
    defaultModel: "gemini-1.5-flash",
    max_tokens: 8192,
  },
  groq: {
    agent: "groqAgent",
    defaultModel: "llama3-8b-8192",
    max_tokens: 4096,
  },
} as const;

export const llmPair = (_llm?: LLM, _model?: string) => {
  const llmKey = _llm ?? "openai";
  const agent = llmConfig[llmKey]?.agent ?? llmConfig.openai.agent;
  const model = _model ?? llmConfig[llmKey]?.defaultModel ?? llmConfig.openai.defaultModel;
  const max_tokens = llmConfig[llmKey]?.max_tokens ?? llmConfig.openai.max_tokens;

  return { agent, model, max_tokens };
};

export const chunkArray = <T>(array: T[], size = 3): T[][] => {
  const chunks = [];
  const copy = [...array];
  while (copy.length) chunks.push(copy.splice(0, size));
  return chunks;
};

export const isHttp = (fileOrUrl: string) => {
  return /^https?:\/\//.test(fileOrUrl);
};

export const text2hash = (input: string): string => {
  return crypto.createHash("sha256").update(input).digest("hex");
};

export const localizedText = (beat: MulmoBeat, multiLingualData?: MulmoStudioMultiLingualData, lang?: string) => {
  if (lang && multiLingualData?.multiLingualTexts?.[lang]?.text) {
    return multiLingualData.multiLingualTexts[lang].text;
  }
  return beat.text;
};

export const sleep = async (milliseconds: number) => {
  return await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export function userAssert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export const settings2GraphAIConfig = (settings?: Record<string, string>): ConfigDataDictionary<DefaultConfigData> => {
  const config: ConfigDataDictionary<DefaultConfigData> = {};
  if (settings) {
    if (settings.OPENAI_API_KEY) {
      config.openAIAgent = {
        apiKey: settings.OPENAI_API_KEY,
      };
      config.ttsOpenaiAgent = {
        apiKey: settings.OPENAI_API_KEY,
      };
      config.imageOpenaiAgent = {
        apiKey: settings.OPENAI_API_KEY,
      };
    }
    if (settings.ANTHROPIC_API_TOKEN) {
      config.anthropicAgent = {
        apiKey: settings.ANTHROPIC_API_TOKEN,
      };
    }
    if (settings.REPLICATE_API_TOKEN) {
      config.movieReplicateAgent = {
        apiKey: settings.REPLICATE_API_TOKEN,
      };
    }
    if (settings.NIJIVOICE_API_KEY) {
      config.ttsNijivoiceAgent = {
        apiKey: settings.NIJIVOICE_API_KEY,
      };
    }
    if (settings.ELEVENLABS_API_KEY) {
      config.ttsElevenlabsAgent = {
        apiKey: settings.ELEVENLABS_API_KEY,
      };
    }
    // TODO
    // browserlessAgent
    // ttsGoogleAgent
    // geminiAgent, groqAgent for tool
    // TAVILY_API_KEY ( for deep research)
  }
  return config;
};
