import dotenv from "dotenv";
import fs from "fs";
import { GraphAI, GraphAILogger, TaskManager } from "graphai";
import type { GraphOptions, GraphData, CallbackFunction } from "graphai";
import { GoogleAuth } from "google-auth-library";

import * as vanilla from "@graphai/vanilla";
import { openAIAgent } from "@graphai/openai_agent";
import { anthropicAgent } from "@graphai/anthropic_agent";

import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { MulmoStudioContext, MulmoStudioBeat, MulmoImageParams } from "../types/index.js";
import { imageGoogleAgent, imageOpenaiAgent, movieGoogleAgent, movieReplicateAgent, mediaMockAgent, soundEffectReplicateAgent } from "../agents/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods } from "../methods/index.js";

import { getOutputStudioFilePath, mkdir } from "../utils/file.js";
import { fileCacheAgentFilter } from "../utils/filters.js";
import { userAssert, settings2GraphAIConfig } from "../utils/utils.js";
import { extractImageFromMovie, ffmpegGetMediaDuration } from "../utils/ffmpeg_utils.js";

import { getImageRefs } from "./image_references.js";
import { imagePreprocessAgent, imagePluginAgent, htmlImageGeneratorAgent } from "./image_agents.js";

const vanillaAgents = vanilla.default ?? vanilla;

const imageAgents = {
  imageGoogleAgent,
  imageOpenaiAgent,
};
const movieAgents = {
  movieGoogleAgent,
  movieReplicateAgent,
};
const soundEffectAgents = {
  soundEffectReplicateAgent,
};
const defaultAgents = {
  ...vanillaAgents,
  ...imageAgents,
  ...movieAgents,
  ...soundEffectAgents,
  mediaMockAgent,
  fileWriteAgent,
  openAIAgent,
  anthropicAgent,
};

dotenv.config();

const beat_graph_data = {
  version: 0.5,
  concurrency: 4,
  nodes: {
    context: {},
    htmlImageAgentInfo: {},
    imageRefs: {},
    beat: {},
    __mapIndex: {},
    forceMovie: { value: false },
    forceImage: { value: false },
    preprocessor: {
      agent: imagePreprocessAgent,
      inputs: {
        context: ":context",
        beat: ":beat",
        index: ":__mapIndex",
        imageRefs: ":imageRefs",
      },
    },
    imagePlugin: {
      if: ":beat.image",
      defaultValue: {},
      agent: imagePluginAgent,
      inputs: {
        context: ":context",
        beat: ":beat",
        index: ":__mapIndex",
        onComplete: [":preprocessor"],
      },
    },
    htmlImageAgent: {
      if: ":preprocessor.htmlPrompt",
      defaultValue: {},
      agent: ":htmlImageAgentInfo.agent",
      inputs: {
        prompt: ":preprocessor.htmlPrompt",
        system: ":preprocessor.htmlImageSystemPrompt",
        params: {
          model: ":htmlImageAgentInfo.model",
          max_tokens: ":htmlImageAgentInfo.max_tokens",
        },
        cache: {
          force: [":context.force", ":forceImage"],
          file: ":preprocessor.htmlPath",
          index: ":__mapIndex",
          mulmoContext: ":context",
          sessionType: "html",
        },
      },
    },
    htmlReader: {
      if: ":preprocessor.htmlPrompt",
      agent: async (namedInputs: { htmlPath: string }) => {
        const html = await fs.promises.readFile(namedInputs.htmlPath, "utf8");
        return { html };
      },
      inputs: {
        onComplete: [":htmlImageAgent"], // to wait for htmlImageAgent to finish
        htmlPath: ":preprocessor.htmlPath",
      },
      output: {
        htmlText: ".html.codeBlockOrRaw()",
      },
      defaultValue: {},
    },
    htmlImageGenerator: {
      if: ":preprocessor.htmlPrompt",
      defaultValue: {},
      agent: htmlImageGeneratorAgent,
      inputs: {
        htmlText: ":htmlReader.htmlText",
        canvasSize: ":context.presentationStyle.canvasSize",
        file: ":preprocessor.imagePath",
      },
    },
    imageGenerator: {
      if: ":preprocessor.prompt",
      agent: ":preprocessor.imageAgentInfo.agent",
      retry: 2,
      inputs: {
        prompt: ":preprocessor.prompt",
        referenceImages: ":preprocessor.referenceImages",
        cache: {
          force: [":context.force", ":forceImage"],
          file: ":preprocessor.imagePath",
          index: ":__mapIndex",
          mulmoContext: ":context",
          sessionType: "image",
        },
        params: {
          model: ":preprocessor.imageParams.model",
          moderation: ":preprocessor.imageParams.moderation",
          canvasSize: ":context.presentationStyle.canvasSize",
        },
      },
      defaultValue: {},
    },
    movieGenerator: {
      if: ":preprocessor.movieFile",
      agent: ":preprocessor.movieAgentInfo.agent",
      inputs: {
        onComplete: [":imageGenerator", ":imagePlugin"], // to wait for imageGenerator to finish
        prompt: ":beat.moviePrompt",
        imagePath: ":preprocessor.referenceImageForMovie",
        cache: {
          force: [":context.force", ":forceMovie"],
          file: ":preprocessor.movieFile",
          index: ":__mapIndex",
          sessionType: "movie",
          mulmoContext: ":context",
        },
        params: {
          model: ":preprocessor.movieAgentInfo.movieParams.model",
          duration: ":beat.duration",
          canvasSize: ":context.presentationStyle.canvasSize",
        },
      },
      defaultValue: {},
    },
    imageFromMovie: {
      if: ":preprocessor.imageFromMovie",
      agent: async (namedInputs: { movieFile: string; imageFile: string }) => {
        return await extractImageFromMovie(namedInputs.movieFile, namedInputs.imageFile);
      },
      inputs: {
        onComplete: [":movieGenerator"], // to wait for movieGenerator to finish
        imageFile: ":preprocessor.imagePath",
        movieFile: ":preprocessor.movieFile",
      },
      defaultValue: {},
    },
    audioChecker: {
      agent: async (namedInputs: { movieFile: string; imageFile: string; soundEffectFile: string }) => {
        if (namedInputs.soundEffectFile) {
          return { hasMovieAudio: true };
        }
        const sourceFile = namedInputs.movieFile || namedInputs.imageFile;
        if (!sourceFile) {
          return { hasMovieAudio: false };
        }
        const { hasAudio } = await ffmpegGetMediaDuration(sourceFile);
        return { hasMovieAudio: hasAudio };
      },
      inputs: {
        onComplete: [":movieGenerator", ":soundEffectGenerator"], // to wait for movieGenerator to finish
        movieFile: ":preprocessor.movieFile",
        imageFile: ":preprocessor.imagePath",
        soundEffectFile: ":preprocessor.soundEffectFile",
      },
    },
    soundEffectGenerator: {
      if: ":preprocessor.soundEffectPrompt",
      agent: ":preprocessor.soundEffectAgentInfo.agentName",
      inputs: {
        onComplete: [":movieGenerator"], // to wait for movieGenerator to finish
        prompt: ":preprocessor.soundEffectPrompt",
        movieFile: ":preprocessor.movieFile",
        soundEffectFile: ":preprocessor.soundEffectFile",
        params: {
          model: ":preprocessor.soundEffectModel",
        },
        cache: {
          force: [":context.force"],
          file: ":preprocessor.soundEffectFile",
          index: ":__mapIndex",
          sessionType: "soundEffect",
          mulmoContext: ":context",
        },
      },
      defaultValue: {},
    },
    output: {
      agent: "copyAgent",
      inputs: {
        onComplete: [":imageFromMovie", ":htmlImageGenerator", ":audioChecker", ":soundEffectGenerator"], // to wait for imageFromMovie to finish
        imageFile: ":preprocessor.imagePath",
        movieFile: ":preprocessor.movieFile",
        soundEffectFile: ":preprocessor.soundEffectFile",
        hasMovieAudio: ":audioChecker.hasMovieAudio",
      },
      output: {
        imageFile: ".imageFile",
        movieFile: ".movieFile",
        soundEffectFile: ".soundEffectFile",
        hasMovieAudio: ".hasMovieAudio",
      },
      isResult: true,
    },
  },
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 4,
  nodes: {
    context: {},
    htmlImageAgentInfo: {},
    outputStudioFilePath: {},
    imageRefs: {},
    map: {
      agent: "mapAgent",
      inputs: {
        rows: ":context.studio.script.beats",
        context: ":context",
        htmlImageAgentInfo: ":htmlImageAgentInfo",
        imageRefs: ":imageRefs",
      },
      isResult: true,
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: beat_graph_data,
    },
    mergeResult: {
      isResult: true,
      agent: (namedInputs: {
        array: { imageFile: string; movieFile: string; soundEffectFile: string; hasMovieAudio: boolean }[];
        context: MulmoStudioContext;
      }) => {
        const { array, context } = namedInputs;
        const { studio } = context;
        const beatIndexMap: Record<string, number> = {};
        array.forEach((update, index) => {
          const beat = studio.beats[index];
          studio.beats[index] = { ...beat, ...update };
          const id = studio.script.beats[index].id;
          if (id) {
            beatIndexMap[id] = index;
          }
        });
        studio.beats.forEach((studioBeat, index) => {
          const beat = studio.script.beats[index];
          if (beat.image?.type === "beat") {
            if (beat.image.id && beatIndexMap[beat.image.id] !== undefined) {
              studioBeat.imageFile = studio.beats[beatIndexMap[beat.image.id]].imageFile;
            } else if (index > 0) {
              studioBeat.imageFile = studio.beats[index - 1].imageFile;
            }
          }
        });
        return {
          ...context,
          studio,
        };
      },
      inputs: {
        array: ":map.output",
        context: ":context",
      },
    },
    writeOutput: {
      agent: "fileWriteAgent",
      inputs: {
        file: ":outputStudioFilePath",
        text: ":mergeResult.studio.toJSON()",
      },
    },
  },
};

const googleAuth = async () => {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token!;
  } catch (error) {
    GraphAILogger.info("install gcloud and run 'gcloud auth application-default login'");
    throw error;
  }
};

export const graphOption = async (context: MulmoStudioContext, settings?: Record<string, string>) => {
  const options: GraphOptions = {
    agentFilters: [
      {
        name: "fileCacheAgentFilter",
        agent: fileCacheAgentFilter,
        nodeIds: ["imageGenerator", "movieGenerator", "htmlImageAgent", "soundEffectGenerator"],
      },
    ],
    taskManager: new TaskManager(MulmoPresentationStyleMethods.getConcurrency(context.presentationStyle)),
  };

  const provider = MulmoPresentationStyleMethods.getText2ImageProvider(context.presentationStyle.imageParams?.provider);

  const config = settings2GraphAIConfig(settings, process.env);

  // We need to get google's auth token only if the google is the text2image provider.
  if (provider === "google" || context.presentationStyle.movieParams?.provider === "google") {
    userAssert(!!config.movieGoogleAgent || !!config.imageGoogleAgent, "GOOGLE_PROJECT_ID is not set");
    GraphAILogger.log("google was specified as text2image engine");
    const token = await googleAuth();
    config["imageGoogleAgent"].token = token;
    config["movieGoogleAgent"].token = token;
  }
  options.config = config;
  return options;
};

const prepareGenerateImages = async (context: MulmoStudioContext) => {
  const fileName = MulmoStudioContextMethods.getFileName(context);
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
  mkdir(imageProjectDirPath);

  const provider = MulmoPresentationStyleMethods.getText2ImageProvider(context.presentationStyle.imageParams?.provider);
  const htmlImageAgentInfo = MulmoPresentationStyleMethods.getHtmlImageAgentInfo(context.presentationStyle);

  const imageRefs = await getImageRefs(context);

  GraphAILogger.info(`text2image: provider=${provider} model=${context.presentationStyle.imageParams?.model}`);
  const injections: Record<string, string | MulmoImageParams | MulmoStudioContext | { agent: string } | Record<string, string> | undefined> = {
    context,
    htmlImageAgentInfo,
    outputStudioFilePath: getOutputStudioFilePath(outDirPath, fileName),
    imageRefs,
  };
  return injections;
};

type ImageOptions = {
  imageAgents: Record<string, unknown>;
};
const generateImages = async (context: MulmoStudioContext, settings?: Record<string, string>, callbacks?: CallbackFunction[], options?: ImageOptions) => {
  const optionImageAgents = options?.imageAgents ?? {};
  const injections = await prepareGenerateImages(context);
  const graphaiAgent = {
    ...defaultAgents,
    ...optionImageAgents,
  };
  const graph = new GraphAI(graph_data, graphaiAgent, await graphOption(context, settings));
  Object.keys(injections).forEach((key: string) => {
    graph.injectValue(key, injections[key]);
  });
  if (callbacks) {
    callbacks.forEach((callback) => {
      graph.registerCallback(callback);
    });
  }
  const res = await graph.run<{ output: MulmoStudioBeat[] }>();
  return res.mergeResult as unknown as MulmoStudioContext;
};

// public api
export const images = async (
  context: MulmoStudioContext,
  args?: {
    settings?: Record<string, string>;
    callbacks?: CallbackFunction[];
    options?: ImageOptions;
  },
): Promise<MulmoStudioContext> => {
  const { settings, callbacks, options } = args ?? {};
  try {
    MulmoStudioContextMethods.setSessionState(context, "image", true);
    const newContext = await generateImages(context, settings, callbacks, options);
    MulmoStudioContextMethods.setSessionState(context, "image", false);
    return newContext;
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "image", false);
    throw error;
  }
};

// public api
export const generateBeatImage = async (inputs: {
  index: number;
  context: MulmoStudioContext;
  settings?: Record<string, string>;
  callbacks?: CallbackFunction[];
  forceMovie?: boolean;
  forceImage?: boolean;
}) => {
  const { index, context, settings, callbacks, forceMovie, forceImage } = inputs;
  const options = await graphOption(context, settings);
  const injections = await prepareGenerateImages(context);
  const graph = new GraphAI(beat_graph_data, defaultAgents, options);
  Object.keys(injections).forEach((key: string) => {
    if ("outputStudioFilePath" !== key) {
      graph.injectValue(key, injections[key]);
    }
  });
  graph.injectValue("__mapIndex", index);
  graph.injectValue("beat", context.studio.script.beats[index]);
  graph.injectValue("forceMovie", forceMovie ?? false);
  graph.injectValue("forceImage", forceImage ?? false);
  if (callbacks) {
    callbacks.forEach((callback) => {
      graph.registerCallback(callback);
    });
  }
  await graph.run<{ output: MulmoStudioBeat[] }>();
};
