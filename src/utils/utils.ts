import * as crypto from "crypto";
import type { ConfigDataDictionary, DefaultConfigData } from "graphai";

import { MulmoBeat, MulmoStudioBeat, MulmoStudioMultiLingual, MulmoStudioMultiLingualData } from "../types/index.js";
import { provider2LLMAgent } from "./provider2agent.js";
import type { LLM } from "./provider2agent.js"; // TODO remove

export const llmPair = (_llm?: LLM, _model?: string) => {
  const llmKey = _llm ?? "openai";
  const agent = provider2LLMAgent[llmKey]?.agentName ?? provider2LLMAgent.openai.agentName;
  const model = _model ?? provider2LLMAgent[llmKey]?.defaultModel ?? provider2LLMAgent.openai.defaultModel;
  const max_tokens = provider2LLMAgent[llmKey]?.max_tokens ?? provider2LLMAgent.openai.max_tokens;

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

export const localizedText = (beat: MulmoBeat, multiLingualData?: MulmoStudioMultiLingualData, targetLang?: string, defaultLang?: string) => {
  if (targetLang === defaultLang) {
    return beat.text;
  }
  if (targetLang && multiLingualData?.multiLingualTexts?.[targetLang]?.text) {
    return multiLingualData.multiLingualTexts[targetLang].text;
  }
  return beat.text;
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
    imageGenAIAgent: {
      apiKey: getKey("IMAGE", "GEMINI_API_KEY"),
    },
    anthropicAgent: {
      apiKey: getKey("LLM", "ANTHROPIC_API_TOKEN"),
    },
    movieReplicateAgent: {
      apiKey: getKey("MOVIE", "REPLICATE_API_TOKEN"),
    },
    movieGenAIAgent: {
      apiKey: getKey("MOVIE", "GEMINI_API_KEY"),
    },
    ttsNijivoiceAgent: {
      apiKey: getKey("TTS", "NIJIVOICE_API_KEY"),
    },
    ttsElevenlabsAgent: {
      apiKey: getKey("TTS", "ELEVENLABS_API_KEY"),
    },
    soundEffectReplicateAgent: {
      apiKey: getKey("SOUND_EFFECT", "REPLICATE_API_TOKEN"),
    },
    lipSyncReplicateAgent: {
      apiKey: getKey("LIPSYNC", "REPLICATE_API_TOKEN"),
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

export const beatId = (id: string | undefined, index: number) => {
  const key = id ?? `__index__${index}`;
  return key;
};

export const multiLingualObjectToArray = (multiLingual: MulmoStudioMultiLingual | undefined, beats: MulmoStudioBeat[]) => {
  return beats.map((beat: MulmoStudioBeat, index: number) => {
    const key = beatId(beat?.id, index);
    if (multiLingual?.[key]) {
      return multiLingual[key];
    }
    return { multiLingualTexts: {} };
  });
};
