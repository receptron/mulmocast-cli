import "dotenv/config";
import fs from "fs";

import { GraphAI, assert, isNull, GraphAILogger } from "graphai";
import type { GraphData, AgentFilterFunction, DefaultParamsType, DefaultResultData } from "graphai";
import * as agents from "@graphai/vanilla";
import { openAIAgent } from "@graphai/openai_agent";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { splitText } from "../utils/string.js";
import { settings2GraphAIConfig, beatId, multiLingualObjectToArray } from "../utils/utils.js";
import { getMultiLingual } from "../utils/context.js";
import { currentMulmoScriptVersion } from "../utils/const.js";
import type {
  LANG,
  MulmoStudioContext,
  MulmoBeat,
  MulmoStudioMultiLingualData,
  MulmoStudioMultiLingual,
  MultiLingualTexts,
  PublicAPIArgs,
} from "../types/index.js";
import { getOutputMultilingualFilePath, mkdir, writingMessage, hashSHA256 } from "../utils/file.js";
import { translateSystemPrompt, translatePrompts } from "../utils/prompt.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

const vanillaAgents = agents.default ?? agents;

// 1. translateGraph / map each beats.
// 2. beatGraph / map each target lang.
// 3. translateTextGraph / translate text.

export const translateTextGraph = {
  version: 0.5,
  nodes: {
    localizedText: {
      inputs: {
        targetLang: ":targetLang", // for cache
        beat: ":beat", // for cache
        multiLingual: ":multiLingual", // for cache
        lang: ":lang", // for cache
        beatIndex: ":beatIndex", // for cache (state)
        mulmoContext: ":context", // for cache (state)
        system: translateSystemPrompt,
        prompt: translatePrompts,
      },
      passThrough: {
        lang: ":targetLang",
      },
      output: {
        text: ".text",
      },
      // return { lang, text } <- localizedText
      agent: "openAIAgent",
    },
    splitText: {
      agent: splitText,
      inputs: {
        targetLang: ":targetLang",
        localizedText: ":localizedText",
      },
    },
    textTranslateResult: {
      isResult: true,
      agent: "copyAgent",
      inputs: {
        lang: ":targetLang",
        text: ":localizedText.text",
        texts: ":splitText",
        ttsTexts: ":splitText",
        cacheKey: ":multiLingual.cacheKey",
      },
    },
  },
};

const beatGraph = {
  version: 0.5,
  nodes: {
    targetLangs: {},
    context: {},
    beat: {},
    __mapIndex: {},
    // for cache
    multiLingual: {
      agent: (namedInputs: { text?: string; multiLinguals?: Record<string, MulmoStudioMultiLingualData>; beatIndex: number }) => {
        const { multiLinguals, beatIndex, text } = namedInputs;
        const cacheKey = hashSHA256(text ?? "");
        const multiLingual = multiLinguals?.[beatIndex];
        if (!multiLingual) {
          return { cacheKey, multiLingualTexts: {} };
        }
        return {
          multiLingualTexts: Object.keys(multiLingual.multiLingualTexts).reduce((tmp: MultiLingualTexts, lang) => {
            if (multiLingual.multiLingualTexts[lang].cacheKey === cacheKey) {
              tmp[lang] = multiLingual.multiLingualTexts[lang];
            }
            return tmp;
          }, {}),
          cacheKey,
        };
      },
      inputs: {
        text: ":beat.text",
        beatIndex: ":__mapIndex",
        multiLinguals: ":context.multiLingual",
      },
    },
    preprocessMultiLingual: {
      agent: "mapAgent",
      inputs: {
        beat: ":beat",
        multiLingual: ":multiLingual",
        rows: ":targetLangs",
        lang: ":context.studio.script.lang",
        context: ":context",
        beatIndex: ":__mapIndex",
      },
      params: {
        compositeResult: true,
        rowKey: "targetLang",
      },
      graph: translateTextGraph,
    },
    mergeLocalizedText: {
      // console: { after: true},
      agent: "arrayToObjectAgent",
      inputs: {
        items: ":preprocessMultiLingual.textTranslateResult",
      },
      params: {
        key: "lang",
      },
    },
    multiLingualTexts: {
      agent: "mergeObjectAgent",
      inputs: {
        items: [":multiLingual.multiLingualTexts", ":mergeLocalizedText"],
      },
    },
    mergeMultiLingualData: {
      isResult: true,
      // console: { after: true},
      agent: "mergeObjectAgent",
      inputs: {
        items: [":multiLingual", { multiLingualTexts: ":multiLingualTexts" }],
      },
    },
  },
};

export const translate_graph_data: GraphData = {
  version: 0.5,
  nodes: {
    context: {},
    outDirPath: {},
    outputMultilingualFilePath: {},
    targetLangs: {},
    mergeStudioResult: {
      isResult: true,
      agent: (namedInputs) => {
        const { multiLingual, beats, originalMultiLingual } = namedInputs;
        const multiLingualObject = beats.reduce((tmp: MulmoStudioMultiLingual, beat: MulmoBeat, beatIndex: number) => {
          const key = beatId(beat?.id, beatIndex);
          const originalData = originalMultiLingual[beatIndex]?.multiLingualTexts ?? {};
          const { multiLingualTexts, cacheKey } = multiLingual[beatIndex];
          tmp[key] = {
            cacheKey,
            multiLingualTexts: {
              ...originalData,
              ...multiLingualTexts,
            },
          };
          return tmp;
        }, {});

        return {
          version: currentMulmoScriptVersion,
          multiLingual: multiLingualObject,
        };
      },
      inputs: {
        originalMultiLingual: ":context.multiLingual", // original
        multiLingual: ":beatsMap.mergeMultiLingualData", // update
        beats: ":context.studio.script.beats",
      },
    },
    beatsMap: {
      agent: "mapAgent",
      inputs: {
        targetLangs: ":targetLangs",
        context: ":context",
        rows: ":context.studio.script.beats",
      },
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: beatGraph,
    },
    writeOutput: {
      agent: "fileWriteAgent",
      inputs: {
        file: ":outputMultilingualFilePath",
        text: ":mergeStudioResult.toJSON()",
      },
    },
  },
};

const localizedTextCacheAgentFilter: AgentFilterFunction<
  DefaultParamsType,
  DefaultResultData,
  { mulmoContext: MulmoStudioContext; targetLang: LANG; beat: MulmoBeat; beatIndex: number; multiLingual: MulmoStudioMultiLingualData; lang: LANG }
> = async (context, next) => {
  const { namedInputs } = context;
  const { mulmoContext, targetLang, beat, beatIndex, lang, multiLingual } = namedInputs;

  if (!beat.text) {
    return { text: "" };
  }

  // same language
  if (targetLang === lang) {
    GraphAILogger.log(`translate: ${beatIndex} same lang`);
    return { text: beat.text };
  }

  // The original text is unchanged and the target language text is present
  if (multiLingual.cacheKey === multiLingual.multiLingualTexts[targetLang]?.cacheKey) {
    GraphAILogger.log(`translate: ${beatIndex} cache hit`);
    return { text: multiLingual.multiLingualTexts[targetLang].text };
  }
  try {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, "multiLingual", beatIndex, beat.id, true);
    GraphAILogger.log(`translate: ${beatIndex} run`);
    return await next(context);
  } finally {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, "multiLingual", beatIndex, beat.id, false);
  }
};
const agentFilters = [
  {
    name: "localizedTextCacheAgentFilter",
    agent: localizedTextCacheAgentFilter as AgentFilterFunction,
    nodeIds: ["localizedText"],
  },
];

export const getOutputMultilingualFilePathAndMkdir = (context: MulmoStudioContext) => {
  const fileName = MulmoStudioContextMethods.getFileName(context);
  const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
  const outputMultilingualFilePath = getOutputMultilingualFilePath(outDirPath, fileName);
  mkdir(outDirPath);
  return { outputMultilingualFilePath, outDirPath };
};

export const translateBeat = async (index: number, context: MulmoStudioContext, targetLangs: string[], args?: PublicAPIArgs) => {
  const { settings, callbacks } = args ?? {};

  // Validate inputs
  if (index < 0 || index >= context.studio.script.beats.length) {
    throw new Error(`Invalid beat index: ${index}. Must be between 0 and ${context.studio.script.beats.length - 1}`);
  }
  if (!targetLangs || targetLangs.length === 0) {
    throw new Error("targetLangs must be a non-empty array");
  }
  try {
    const { outputMultilingualFilePath } = getOutputMultilingualFilePathAndMkdir(context);

    const config = settings2GraphAIConfig(settings, process.env);
    assert(!!config?.openAIAgent?.apiKey, "The OPENAI_API_KEY environment variable is missing or empty");

    const graph = new GraphAI(beatGraph, { ...vanillaAgents, fileWriteAgent, openAIAgent }, { agentFilters, config });
    graph.injectValue("context", context);
    graph.injectValue("targetLangs", targetLangs);
    graph.injectValue("beat", context.studio.script.beats[index]);
    graph.injectValue("__mapIndex", index);
    if (callbacks) {
      callbacks.forEach((callback) => {
        graph.registerCallback(callback);
      });
    }
    const results = await graph.run<MulmoStudioMultiLingualData>();

    const multiLingual = getMultiLingual(outputMultilingualFilePath, context.studio.beats);
    const key = beatId(context.studio.script.beats[index]?.id, index);
    multiLingual[key] = results.mergeMultiLingualData!;
    const data = {
      version: currentMulmoScriptVersion,
      multiLingual,
    };
    fs.writeFileSync(outputMultilingualFilePath, JSON.stringify(data, null, 2), "utf8");
    writingMessage(outputMultilingualFilePath);
  } catch (error) {
    GraphAILogger.log(error);
  }
};

export const translate = async (context: MulmoStudioContext, args?: PublicAPIArgs & { targetLangs?: string[] }) => {
  const { settings, callbacks } = args ?? {};
  try {
    MulmoStudioContextMethods.setSessionState(context, "multiLingual", true);
    const { outputMultilingualFilePath, outDirPath } = getOutputMultilingualFilePathAndMkdir(context);

    const targetLangs = args?.targetLangs
      ? args?.targetLangs
      : [...new Set([context.lang, context.studio.script.captionParams?.lang].filter((x) => !isNull(x)))];
    const config = settings2GraphAIConfig(settings, process.env);

    assert(!!config?.openAIAgent?.apiKey, "The OPENAI_API_KEY environment variable is missing or empty");

    const graph = new GraphAI(translate_graph_data, { ...vanillaAgents, fileWriteAgent, openAIAgent }, { agentFilters, config });

    graph.injectValue("context", context);
    graph.injectValue("targetLangs", targetLangs);
    graph.injectValue("outDirPath", outDirPath);
    graph.injectValue("outputMultilingualFilePath", outputMultilingualFilePath);
    if (callbacks) {
      callbacks.forEach((callback) => {
        graph.registerCallback(callback);
      });
    }
    const results = await graph.run<{ multiLingual: MulmoStudioMultiLingual }>();
    writingMessage(outputMultilingualFilePath);
    if (results.mergeStudioResult) {
      context.multiLingual = multiLingualObjectToArray(results?.mergeStudioResult?.multiLingual, context.studio.script.beats);
    }
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "multiLingual", false);
  }
  return context;
};
