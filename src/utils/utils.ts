/**
 * Browser-friendly packages only.
 * (No Node.js built-ins like fs, path, dotenv, etc.)
 * Works in both Node.js and modern browsers.
 */

import type { ConfigDataDictionary, DefaultConfigData } from "graphai";

import { MulmoBeat, MulmoStudioBeat, MulmoStudioMultiLingual, MulmoStudioMultiLingualData } from "../types/index.js";
import {
  type LLM,
  provider2LLMAgent,
  provider2TTSAgent,
  provider2ImageAgent,
  provider2MovieAgent,
  provider2SoundEffectAgent,
  provider2LipSyncAgent,
} from "./provider2agent.js";

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

export const localizedText = (beat: MulmoBeat, multiLingualData?: MulmoStudioMultiLingualData, targetLang?: string, defaultLang?: string) => {
  if (targetLang === defaultLang) {
    return beat.text;
  }
  if (targetLang && multiLingualData?.multiLingualTexts?.[targetLang]?.text) {
    return multiLingualData.multiLingualTexts[targetLang].text;
  }
  return beat.text;
};

export function processLineBreaks(text: string) {
  return text.replace(/\n/g, "<br>");
}

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

  const addProviderConfigs = <T extends Record<string, { agentName: string; keyName?: string; baseURLKeyName?: string; apiKeyNameOverride?: string }>>(
    config: ConfigDataDictionary<DefaultConfigData>,
    providers: T,
    prefix: string,
  ) => {
    Object.entries(providers).forEach(([__provider, info]) => {
      if (info.agentName === "mediaMockAgent" || !info.keyName) return;

      const apiKeyName = info.apiKeyNameOverride || info.keyName;
      config[info.agentName] = {
        apiKey: getKey(prefix, apiKeyName),
      };

      if (info.baseURLKeyName) {
        config[info.agentName].baseURL = getKey(prefix, info.baseURLKeyName);
      }
    });
  };

  const config: ConfigDataDictionary<DefaultConfigData> = {};

  addProviderConfigs(config, provider2LLMAgent, "LLM");
  addProviderConfigs(config, provider2TTSAgent, "TTS");
  addProviderConfigs(config, provider2ImageAgent, "IMAGE");
  addProviderConfigs(config, provider2MovieAgent, "MOVIE");
  addProviderConfigs(config, provider2SoundEffectAgent, "SOUND_EFFECT");
  addProviderConfigs(config, provider2LipSyncAgent, "LIPSYNC");

  // TODO
  // browserlessAgent
  // geminiAgent, groqAgent for tool
  // TAVILY_API_KEY ( for deep research)

  return deepClean(config) ?? {};
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

export const getAspectRatio = (canvasSize: { width: number; height: number }, ASPECT_RATIOS: string[]): string => {
  const target = canvasSize.width / canvasSize.height;
  return ASPECT_RATIOS.reduce(
    (best, ratio) => {
      const [w, h] = ratio.split(":").map(Number);
      const r = w / h;
      const diff = Math.abs(target - r);
      return diff < best.diff ? { ratio, diff } : best;
    },
    { ratio: ASPECT_RATIOS[0], diff: Infinity },
  ).ratio;
};
