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

export const settings2GraphAIConfig = (
  settings?: Record<string, string>,
  env?: Record<string, string | undefined>,
): ConfigDataDictionary<DefaultConfigData> => {
  const getKey = (prefix: string, key: string) => {
    return settings?.[`${prefix}_${key}`] ?? settings?.[key] ?? env?.[`${prefix}_${key}`] ?? env?.[key];
  };

  const config: ConfigDataDictionary<DefaultConfigData> = {
    openAIAgent: {
      apiKey: getKey("LLM", "OPENAI_API_KEY"),
      baseURL: getKey("LLM", "OPENAI_BASE_URL"),
    },
    ttsOpenaiAgent: {
      apiKey: getKey("TTS", "OPENAI_API_KEY"),
      baseURL: getKey("TTS", "OPENAI_BASE_URL"),
    },
    imageOpenaiAgent: {
      apiKey: getKey("IMAGE", "OPENAI_API_KEY"),
      baseURL: getKey("IMAGE", "OPENAI_BASE_URL"),
    },
    anthropicAgent: {
      apiKey: getKey("LLM", "ANTHROPIC_API_TOKEN"),
    },
    movieReplicateAgent: {
      apiKey: getKey("MOVIE", "REPLICATE_API_TOKEN"),
    },
    ttsNijivoiceAgent: {
      apiKey: getKey("TTS", "NIJIVOICE_API_KEY"),
    },
    ttsElevenlabsAgent: {
      apiKey: getKey("TTS", "ELEVENLABS_API_KEY"),
    },

    // TODO
    // browserlessAgent
    // ttsGoogleAgent
    // geminiAgent, groqAgent for tool
    // TAVILY_API_KEY ( for deep research)
  };
  return deepClean(config) ?? {};
};

export const getExtention = (contentType: string | null, url: string) => {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "jpg";
  } else if (contentType?.includes("png")) {
    return "png";
  }
  // Fall back to URL extension
  const urlExtension = url.split(".").pop()?.toLowerCase();
  if (urlExtension && ["jpg", "jpeg", "png"].includes(urlExtension)) {
    return urlExtension === "jpeg" ? "jpg" : urlExtension;
  }
  return "png"; // default
};

// deepClean

type Primitive = string | number | boolean | symbol | bigint;
type CleanableValue = Primitive | null | undefined | CleanableObject | CleanableValue[];
type CleanableObject = { [key: string]: CleanableValue };

export const deepClean = <T extends CleanableValue>(input: T): T | undefined => {
  if (input === null || input === undefined || input === "") {
    return undefined;
  }

  if (Array.isArray(input)) {
    const cleanedArray = input.map(deepClean).filter((v): v is Exclude<T, undefined> => v !== undefined);
    return cleanedArray.length > 0 ? (cleanedArray as unknown as T) : undefined;
  }

  if (typeof input === "object") {
    const result: Record<string, CleanableValue> = {};
    for (const [key, value] of Object.entries(input)) {
      const cleaned = deepClean(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return Object.keys(result).length > 0 ? (result as T) : undefined;
  }

  return input;
};
