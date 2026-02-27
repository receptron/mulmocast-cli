import dotenv from "dotenv";
import fs from "fs";
import { GraphAI, GraphAILogger, TaskManager } from "graphai";
import type { GraphOptions, GraphData } from "graphai";
import { AuthenticationError, RateLimitError } from "openai/index.js";

import * as vanilla from "@graphai/vanilla";
import { openAIAgent } from "@graphai/openai_agent";
import { anthropicAgent } from "@graphai/anthropic_agent";

import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { MulmoStudioContext, MulmoStudioBeat, MulmoImageParams, PublicAPIArgs } from "../types/index.js";
import {
  imageGenAIAgent,
  imageOpenaiAgent,
  imageReplicateAgent,
  movieGenAIAgent,
  movieReplicateAgent,
  mediaMockAgent,
  soundEffectReplicateAgent,
  lipSyncReplicateAgent,
} from "../agents/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods } from "../methods/index.js";

import { agentIncorrectAPIKeyError, agentAPIRateLimitError, imageAction, imageFileTarget } from "../utils/error_cause.js";

import { getOutputStudioFilePath, mkdir } from "../utils/file.js";
import { fileCacheAgentFilter } from "../utils/filters.js";
import { settings2GraphAIConfig } from "../utils/utils.js";
import { audioCheckerError } from "../utils/error_cause.js";
import { extractImageFromMovie, ffmpegGetMediaDuration, trimMusic } from "../utils/ffmpeg_utils.js";

import { getImageRefs } from "./image_references.js";
import { imagePreprocessAgent, imagePluginAgent, htmlImageGeneratorAgent } from "./image_agents.js";

const vanillaAgents = vanilla.default ?? vanilla;

const imageAgents = {
  imageGenAIAgent,
  imageOpenaiAgent,
  imageReplicateAgent,
};
const movieAgents = {
  movieGenAIAgent,
  movieReplicateAgent,
  mediaMockAgent,
};
const soundEffectAgents = {
  soundEffectReplicateAgent,
};
const lipSyncAgents = {
  lipSyncReplicateAgent,
};
const defaultAgents = {
  ...vanillaAgents,
  ...imageAgents,
  ...movieAgents,
  ...soundEffectAgents,
  ...lipSyncAgents,
  mediaMockAgent,
  fileWriteAgent,
  openAIAgent,
  anthropicAgent,
};

dotenv.config({ quiet: true });

export const beat_graph_data = {
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
    forceLipSync: { value: false },
    forceSoundEffect: { value: false },
    withBackup: { value: false },
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
        imageRefs: ":imageRefs",
        onComplete: [":preprocessor"],
      },
    },
    htmlImageAgent: {
      if: ":preprocessor.htmlPrompt",
      defaultValue: {},
      agent: ":htmlImageAgentInfo.agent",
      inputs: {
        media: "html",
        prompt: ":preprocessor.htmlPrompt",
        system: ":preprocessor.htmlImageSystemPrompt",
        params: {
          model: ":htmlImageAgentInfo.model",
          max_tokens: ":htmlImageAgentInfo.max_tokens",
        },
        cache: {
          force: [":context.force", ":forceImage"],
          withBackup: [":context.backup", ":withBackup"],
          file: ":preprocessor.htmlPath",
          index: ":__mapIndex",
          id: ":beat.id",
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
        file: ":preprocessor.htmlImageFile",
      },
    },
    imageGenerator: {
      if: ":preprocessor.prompt",
      agent: ":preprocessor.imageAgentInfo.agent",
      retry: 2,
      inputs: {
        media: "image",
        prompt: ":preprocessor.prompt",
        referenceImages: ":preprocessor.referenceImages",
        cache: {
          force: [":context.force", ":forceImage"],
          withBackup: [":context.backup", ":withBackup"],
          file: ":preprocessor.imagePath",
          index: ":__mapIndex",
          id: ":beat.id",
          mulmoContext: ":context",
          sessionType: "image",
        },
        params: {
          model: ":preprocessor.imageParams.model",
          moderation: ":preprocessor.imageParams.moderation",
          canvasSize: ":context.presentationStyle.canvasSize",
          quality: ":preprocessor.imageParams.quality",
          vertexai_project: ":preprocessor.imageParams.vertexai_project",
          vertexai_location: ":preprocessor.imageParams.vertexai_location",
        },
      },
      defaultValue: {},
    },
    movieGenerator: {
      if: ":beat.moviePrompt",
      agent: ":preprocessor.movieAgentInfo.agent",
      inputs: {
        media: "movie",
        onComplete: [":imageGenerator", ":imagePlugin"], // to wait for imageGenerator to finish
        prompt: ":beat.moviePrompt",
        imagePath: ":preprocessor.referenceImageForMovie",
        movieFile: ":preprocessor.movieFile", // for google genai agent
        cache: {
          force: [":context.force", ":forceMovie"],
          withBackup: [":context.backup", ":withBackup"],
          file: ":preprocessor.movieFile",
          index: ":__mapIndex",
          id: ":beat.id",
          sessionType: "movie",
          mulmoContext: ":context",
        },
        params: {
          model: ":preprocessor.movieAgentInfo.movieParams.model",
          duration: ":preprocessor.beatDuration",
          canvasSize: ":context.presentationStyle.canvasSize",
          vertexai_project: ":preprocessor.movieAgentInfo.movieParams.vertexai_project",
          vertexai_location: ":preprocessor.movieAgentInfo.movieParams.vertexai_location",
        },
      },
      defaultValue: {},
    },
    imageFromMovie: {
      if: ":preprocessor.imageFromMovie",
      agent: async (namedInputs: { movieFile: string; imageFile: string; useLastFrame: boolean }) => {
        return await extractImageFromMovie(namedInputs.movieFile, namedInputs.imageFile, namedInputs.useLastFrame);
      },
      inputs: {
        onComplete: [":movieGenerator", ":imagePlugin"], // :imagePlugin for animated html_tailwind video generation
        imageFile: ":preprocessor.imagePath",
        movieFile: ":preprocessor.movieFile",
        useLastFrame: ":preprocessor.useLastFrame",
      },
      defaultValue: {},
    },
    audioChecker: {
      agent: async (namedInputs: { movieFile: string; imageFile: string; soundEffectFile: string; index: number }) => {
        // NOTE: We intentinonally don't check lipSyncFile here.
        if (namedInputs.soundEffectFile) {
          return { hasMovieAudio: true };
        }
        const sourceFile = namedInputs.movieFile || namedInputs.imageFile;
        if (!sourceFile) {
          // no need to check if the file exists (ffmpegGetMediaDuration will check it if it is local file)
          return { hasMovieAudio: false };
        }
        try {
          const { hasAudio } = await ffmpegGetMediaDuration(sourceFile);
          return { hasMovieAudio: hasAudio };
        } catch (error) {
          GraphAILogger.error(error);
          throw new Error(`audioChecker: ffmpegGetMediaDuration error:  index=${namedInputs.index} file=${sourceFile}`, {
            cause: audioCheckerError(namedInputs.index, sourceFile),
          });
        }
      },
      inputs: {
        onComplete: [":movieGenerator", ":htmlImageGenerator", ":soundEffectGenerator", ":imagePlugin"], // :imagePlugin for animated html_tailwind video generation
        movieFile: ":preprocessor.movieFile",
        imageFile: ":preprocessor.imagePath",
        soundEffectFile: ":preprocessor.soundEffectFile",
        index: ":__mapIndex",
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
          duration: ":preprocessor.beatDuration",
        },
        cache: {
          force: [":context.force", ":forceSoundEffect"],
          withBackup: [":context.backup", ":withBackup"],
          file: ":preprocessor.soundEffectFile",
          index: ":__mapIndex",
          id: ":beat.id",
          sessionType: "soundEffect",
          mulmoContext: ":context",
        },
      },
      defaultValue: {},
    },
    AudioTrimmer: {
      if: ":preprocessor.lipSyncTrimAudio",
      agent: async (namedInputs: { audioFile: string; bgmFile: string; startAt: number; duration: number }) => {
        const buffer = await trimMusic(namedInputs.bgmFile, namedInputs.startAt, namedInputs.duration);
        return { buffer };
      },
      inputs: {
        onComplete: [":imageGenerator", ":imagePlugin"],
        audioFile: ":preprocessor.audioFile",
        bgmFile: ":preprocessor.bgmFile",
        startAt: ":preprocessor.startAt",
        duration: ":preprocessor.duration",
        cache: {
          force: [":context.force"],
          file: ":preprocessor.audioFile",
          index: ":__mapIndex",
          id: ":beat.id",
          mulmoContext: ":context",
          // sessionType: undefined, // no need to notify state change
        },
      },
      defaultValue: {},
    },
    lipSyncGenerator: {
      if: ":beat.enableLipSync",
      agent: ":preprocessor.lipSyncAgentName",
      inputs: {
        onComplete: [":soundEffectGenerator", ":AudioTrimmer"], // to wait for soundEffectGenerator to finish
        movieFile: ":preprocessor.movieFile",
        imageFile: ":preprocessor.referenceImageForMovie",
        audioFile: ":preprocessor.audioFile",
        lipSyncFile: ":preprocessor.lipSyncFile",
        params: {
          model: ":preprocessor.lipSyncModel",
          duration: ":preprocessor.beatDuration",
        },
        cache: {
          force: [":context.force", ":forceLipSync"],
          withBackup: [":context.backup", ":withBackup"],
          file: ":preprocessor.lipSyncFile",
          index: ":__mapIndex",
          id: ":beat.id",
          sessionType: "lipSync",
          mulmoContext: ":context",
        },
      },
      defaultValue: {},
    },
    output: {
      agent: "copyAgent",
      inputs: {
        onComplete: [":imageFromMovie", ":htmlImageGenerator", ":audioChecker", ":soundEffectGenerator", ":lipSyncGenerator"], // to wait for imageFromMovie, soundEffectGenerator, and lipSyncGenerator to finish
        imageFile: ":preprocessor.imagePath",
        movieFile: ":preprocessor.movieFile",
        soundEffectFile: ":preprocessor.soundEffectFile",
        lipSyncFile: ":preprocessor.lipSyncFile",
        hasMovieAudio: ":audioChecker.hasMovieAudio",
        htmlImageFile: ":preprocessor.htmlImageFile",
        markdown: ":preprocessor.markdown",
        html: ":preprocessor.html",
      },
      output: {
        imageFile: ".imageFile",
        movieFile: ".movieFile",
        soundEffectFile: ".soundEffectFile",
        lipSyncFile: ".lipSyncFile",
        hasMovieAudio: ".hasMovieAudio",
        htmlImageFile: ".htmlImageFile",
        markdown: ".markdown",
        html: ".html",
      },
      isResult: true,
    },
  },
};

export const images_graph_data: GraphData = {
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
        array: { imageFile: string; movieFile: string; soundEffectFile: string; lipSyncFile: string; hasMovieAudio: boolean }[];
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
            // reference Beat by plugin
            const referenceBeat = (() => {
              if (beat.image.id) {
                if (beatIndexMap[beat.image.id] !== undefined) {
                  return studio.beats[beatIndexMap[beat.image.id]];
                } else {
                  GraphAILogger.info(`reference beat not exist: id=${beat.image.id}`);
                }
              } else if (index > 0) {
                return studio.beats[index - 1];
              }
            })();
            if (referenceBeat === undefined) {
              // error?
              GraphAILogger.info(`reference beat not exist: index=${index}`);
            } else {
              studioBeat.imageFile = referenceBeat.imageFile;
              studioBeat.movieFile = referenceBeat.movieFile;
              studioBeat.soundEffectFile = referenceBeat.soundEffectFile;
              studioBeat.lipSyncFile = referenceBeat.lipSyncFile;
              studioBeat.hasMovieAudio = referenceBeat.hasMovieAudio;
              studioBeat.htmlImageFile = referenceBeat.htmlImageFile;
              studioBeat.markdown = referenceBeat.markdown;
              studioBeat.html = referenceBeat.html;
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

export const graphOption = async (context: MulmoStudioContext, settings?: Record<string, string>) => {
  const options: GraphOptions = {
    agentFilters: [
      {
        name: "fileCacheAgentFilter",
        agent: fileCacheAgentFilter,
        nodeIds: ["imageGenerator", "movieGenerator", "htmlImageAgent", "soundEffectGenerator", "lipSyncGenerator", "AudioTrimmer"],
      },
    ],
    taskManager: new TaskManager(MulmoPresentationStyleMethods.getConcurrency(context.presentationStyle)),
    config: settings2GraphAIConfig(settings, process.env),
  };

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
const generateImages = async (context: MulmoStudioContext, args?: PublicAPIArgs & { options?: ImageOptions }) => {
  const { settings, callbacks, options } = args ?? {};
  const optionImageAgents = options?.imageAgents ?? {};
  const injections = await prepareGenerateImages(context);
  const graphaiAgent = {
    ...defaultAgents,
    ...optionImageAgents,
  };
  const graph = new GraphAI(images_graph_data, graphaiAgent, await graphOption(context, settings));
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
export const images = async (context: MulmoStudioContext, args?: PublicAPIArgs & { options?: ImageOptions }): Promise<MulmoStudioContext> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "image", true);
    const newContext = await generateImages(context, args);
    MulmoStudioContextMethods.setSessionState(context, "image", false, true);
    return newContext;
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "image", false, false);
    if (error instanceof AuthenticationError) {
      throw new Error("Failed to generate image: 401 Incorrect API key provided with OpenAI", {
        cause: agentIncorrectAPIKeyError("openAIAgent", imageAction, imageFileTarget),
      });
    }
    if (error instanceof RateLimitError) {
      throw new Error("You exceeded your current quota", {
        cause: agentAPIRateLimitError("openAIAgent", imageAction, imageFileTarget),
      });
    }
    throw error;
  }
};

// public api
export const generateBeatImage = async (inputs: {
  index: number;
  context: MulmoStudioContext;
  args?: PublicAPIArgs & {
    forceMovie?: boolean;
    forceImage?: boolean;
    forceLipSync?: boolean;
    forceSoundEffect?: boolean;
    withBackup?: boolean;
  };
}) => {
  try {
    const { index, context, args } = inputs;
    const { settings, callbacks, forceMovie, forceImage, forceLipSync, forceSoundEffect, withBackup } = args ?? {};
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
    graph.injectValue("forceLipSync", forceLipSync ?? false);
    graph.injectValue("forceSoundEffect", forceSoundEffect ?? false);
    graph.injectValue("withBackup", withBackup ?? false);
    if (callbacks) {
      callbacks.forEach((callback) => {
        graph.registerCallback(callback);
      });
    }
    await graph.run<{ output: MulmoStudioBeat[] }>();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error("Failed to generate image: 401 Incorrect API key provided with OpenAI", {
        cause: agentIncorrectAPIKeyError("openAIAgent", imageAction, imageFileTarget),
      });
    }
    if (error instanceof RateLimitError) {
      throw new Error("You exceeded your current quota", {
        cause: agentAPIRateLimitError("openAIAgent", imageAction, imageFileTarget),
      });
    }
    throw error;
  }
};
