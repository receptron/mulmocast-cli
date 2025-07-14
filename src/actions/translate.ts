import "dotenv/config";
import { GraphAI, assert } from "graphai";
import type { GraphData, AgentFilterFunction, DefaultParamsType, DefaultResultData, CallbackFunction } from "graphai";
import * as agents from "@graphai/vanilla";
import { openAIAgent } from "@graphai/openai_agent";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { recursiveSplitJa, replacementsJa, replacePairsJa } from "../utils/string.js";
import { LANG, LocalizedText, MulmoStudioContext, MulmoBeat, MulmoStudioMultiLingualData, MulmoStudioMultiLingual } from "../types/index.js";
import { getOutputMultilingualFilePath, mkdir, writingMessage } from "../utils/file.js";
import { translateSystemPrompt, translatePrompts } from "../utils/prompt.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

const vanillaAgents = agents.default ?? agents;

const translateGraph: GraphData = {
  version: 0.5,
  nodes: {
    context: {},
    defaultLang: {},
    outDirPath: {},
    outputMultilingualFilePath: {},
    lang: {
      agent: "stringUpdateTextAgent",
      inputs: {
        newText: ":context.studio.script.lang",
        oldText: ":defaultLang",
      },
    },
    targetLangs: {}, // TODO
    mergeStudioResult: {
      isResult: true,
      agent: "mergeObjectAgent",
      inputs: {
        items: [{ multiLingual: ":beatsMap.mergeMultiLingualData" }],
      },
    },
    beatsMap: {
      agent: "mapAgent",
      inputs: {
        targetLangs: ":targetLangs",
        context: ":context",
        rows: ":context.studio.script.beats",
        lang: ":lang",
      },
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: {
        version: 0.5,
        nodes: {
          // for cache
          multiLingual: {
            agent: (namedInputs: { rows?: MulmoStudioMultiLingualData[]; index: number }) => {
              return (namedInputs.rows && namedInputs.rows[namedInputs.index]) || {};
            },
            inputs: {
              index: ":__mapIndex",
              rows: ":context.multiLingual",
            },
          },
          preprocessMultiLingual: {
            agent: "mapAgent",
            inputs: {
              beat: ":beat",
              multiLingual: ":multiLingual",
              rows: ":targetLangs",
              lang: ":lang.text",
              context: ":context",
              beatIndex: ":__mapIndex",
            },
            params: {
              compositeResult: true,
              rowKey: "targetLang",
            },
            graph: {
              version: 0.5,
              nodes: {
                localizedTexts: {
                  inputs: {
                    targetLang: ":targetLang", // for cache
                    beat: ":beat", // for cache
                    multiLingual: ":multiLingual", // for cache
                    lang: ":lang", // for cache
                    beatIndex: ":beatIndex", // for cache
                    mulmoContext: ":context", // for cache
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
                  agent: (namedInputs: { localizedText: LocalizedText; targetLang: LANG }) => {
                    const { localizedText, targetLang } = namedInputs;
                    // Cache
                    if (localizedText.texts) {
                      return localizedText;
                    }
                    if (targetLang === "ja") {
                      return {
                        ...localizedText,
                        texts: recursiveSplitJa(localizedText.text),
                      };
                    }
                    // not split
                    return {
                      ...localizedText,
                      texts: [localizedText.text],
                    };
                    // return { lang, text, texts }
                  },
                  inputs: {
                    targetLang: ":targetLang",
                    localizedText: ":localizedTexts",
                  },
                },
                ttsTexts: {
                  agent: (namedInputs: { localizedText: LocalizedText; targetLang: LANG }) => {
                    const { localizedText, targetLang } = namedInputs;
                    // cache
                    if (localizedText.ttsTexts) {
                      return localizedText;
                    }
                    if (targetLang === "ja") {
                      return {
                        ...localizedText,
                        ttsTexts: localizedText?.texts?.map((text: string) => replacePairsJa(text, replacementsJa)),
                      };
                    }
                    return {
                      ...localizedText,
                      ttsTexts: localizedText.texts,
                    };
                  },
                  inputs: {
                    targetLang: ":targetLang",
                    localizedText: ":splitText",
                  },
                  isResult: true,
                },
              },
            },
          },
          mergeLocalizedText: {
            agent: "arrayToObjectAgent",
            inputs: {
              items: ":preprocessMultiLingual.ttsTexts",
            },
            params: {
              key: "lang",
            },
          },
          mergeMultiLingualData: {
            isResult: true,
            agent: "mergeObjectAgent",
            inputs: {
              items: [":multiLingual", { multiLingualTexts: ":mergeLocalizedText" }],
            },
          },
        },
      },
    },
    writeOutput: {
      // console: { before: true },
      agent: "fileWriteAgent",
      inputs: {
        file: ":outputMultilingualFilePath",
        text: ":mergeStudioResult.multiLingual.toJSON()",
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

  // The original text is unchanged and the target language text is present
  if (multiLingual.multiLingualTexts?.[lang] && multiLingual.multiLingualTexts[lang].text === beat.text && multiLingual.multiLingualTexts?.[targetLang]?.text) {
    return { text: multiLingual.multiLingualTexts[targetLang].text };
  }
  // same language
  if (targetLang === lang) {
    return { text: beat.text };
  }
  try {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, "multiLingual", beatIndex, true);
    return await next(context);
  } finally {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, "multiLingual", beatIndex, false);
  }
};
const agentFilters = [
  {
    name: "localizedTextCacheAgentFilter",
    agent: localizedTextCacheAgentFilter as AgentFilterFunction,
    nodeIds: ["localizedTexts"],
  },
];

const defaultLang = "en";
const targetLangs = ["ja", "en"];

export const translate = async (context: MulmoStudioContext, callbacks?: CallbackFunction[]) => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "multiLingual", true);
    const fileName = MulmoStudioContextMethods.getFileName(context);
    const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
    const outputMultilingualFilePath = getOutputMultilingualFilePath(outDirPath, fileName);
    mkdir(outDirPath);

    assert(!!process.env.OPENAI_API_KEY, "The OPENAI_API_KEY environment variable is missing or empty");

    const graph = new GraphAI(translateGraph, { ...vanillaAgents, fileWriteAgent, openAIAgent }, { agentFilters });
    graph.injectValue("context", context);
    graph.injectValue("defaultLang", defaultLang);
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
      context.multiLingual = results.mergeStudioResult.multiLingual;
    }
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "multiLingual", false);
  }
};
