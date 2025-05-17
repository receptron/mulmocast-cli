import dotenv from "dotenv";
import { GraphAI, GraphAILogger } from "graphai";
import type { GraphOptions, GraphData } from "graphai";
import * as agents from "@graphai/vanilla";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { MulmoStudioContext, MulmoBeat, MulmoScript, MulmoStudioBeat, MulmoImageParams, Text2ImageAgentInfo } from "../types/index.js";
import { getOutputStudioFilePath, mkdir } from "../utils/file.js";
import { fileCacheAgentFilter } from "../utils/filters.js";
import imageGoogleAgent from "../agents/image_google_agent.js";
import imageOpenaiAgent from "../agents/image_openai_agent.js";
import { MulmoScriptMethods } from "../methods/index.js";
import { imagePlugins } from "../utils/image_plugins/index.js";

const { default: __, ...vanillaAgents } = agents;

dotenv.config();
// const openai = new OpenAI();
import { GoogleAuth } from "google-auth-library";

const htmlStyle = (script: MulmoScript, beat: MulmoBeat) => {
  return {
    canvasSize: MulmoScriptMethods.getCanvasSize(script),
    textSlideStyle: MulmoScriptMethods.getTextSlideStyle(script, beat),
  };
};

const imagePreprocessAgent = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  suffix: string;
  imageDirPath: string;
  imageAgentInfo: Text2ImageAgentInfo;
}) => {
  const { context, beat, index, suffix, imageDirPath, imageAgentInfo } = namedInputs;
  const imageParams = { ...imageAgentInfo.imageParams, ...beat.imageParams };
  const imagePath = `${imageDirPath}/${context.studio.filename}/${index}${suffix}.png`;
  const returnValue = {
    aspectRatio: MulmoScriptMethods.getAspectRatio(context.studio.script),
    imageParams,
  };

  if (beat.image) {
    const plugin = imagePlugins.find((plugin) => plugin.imageType === beat?.image?.type);
    if (plugin) {
      const processorParams = { beat, context, imagePath, ...htmlStyle(context.studio.script, beat) };
      const path = await plugin.process(processorParams);
      // undefined prompt indicates that image generation is not needed
      return { path, ...returnValue };
    }
  }

  const prompt = (beat.imagePrompt || `generate image appropriate for the text. text: ${beat.text}`) + "\n" + (imageParams.style || "");
  return { path: imagePath, prompt, ...returnValue };
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 2,
  nodes: {
    context: {},
    imageDirPath: {},
    imageAgentInfo: {},
    outputStudioFilePath: {},
    map: {
      agent: "mapAgent",
      inputs: { rows: ":context.studio.script.beats", context: ":context", imageAgentInfo: ":imageAgentInfo", imageDirPath: ":imageDirPath" },
      isResult: true,
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: {
        nodes: {
          preprocessor: {
            agent: imagePreprocessAgent,
            inputs: {
              context: ":context",
              beat: ":beat",
              index: ":__mapIndex",
              suffix: "p",
              imageDirPath: ":imageDirPath",
              imageAgentInfo: ":imageAgentInfo",
            },
          },
          imageGenerator: {
            if: ":preprocessor.prompt",
            agent: ":imageAgentInfo.agent",
            params: {
              model: ":preprocessor.imageParams.model",
              size: ":preprocessor.imageParams.size",
              moderation: ":preprocessor.imageParams.moderation",
              aspectRatio: ":preprocessor.aspectRatio",
            },
            inputs: {
              prompt: ":preprocessor.prompt",
              file: ":preprocessor.path", // only for fileCacheAgentFilter
              text: ":preprocessor.prompt", // only for fileCacheAgentFilter
              force: ":context.force",
            },
            defaultValue: {},
          },
          output: {
            agent: "copyAgent",
            inputs: {
              result: ":imageGenerator",
              image: ":preprocessor.path",
            },
            output: {
              imageFile: ".image",
            },
            isResult: true,
          },
        },
      },
    },
    mergeResult: {
      agent: (namedInputs: { array: { imageFile: string }[]; context: MulmoStudioContext }) => {
        const { array, context } = namedInputs;
        const { studio } = context;
        array.forEach((update, index) => {
          const beat = studio.beats[index];
          studio.beats[index] = { ...beat, ...update };
        });
        // console.log(namedInputs);
        return { studio };
      },
      inputs: {
        array: ":map.output",
        context: ":context",
      },
    },
    writeOutout: {
      // console: { before: true },
      agent: "fileWriteAgent",
      inputs: {
        file: ":outputStudioFilePath",
        text: ":mergeResult.studio.toJSON()",
      },
    },
  },
};

const googleAuth = async () => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token!;
};

export const images = async (context: MulmoStudioContext) => {
  const { studio, fileDirs } = context;
  const { outDirPath, imageDirPath } = fileDirs;
  mkdir(`${imageDirPath}/${studio.filename}`);

  const agentFilters = [
    {
      name: "fileCacheAgentFilter",
      agent: fileCacheAgentFilter,
      nodeIds: ["imageGenerator"],
    },
  ];

  const options: GraphOptions = {
    agentFilters,
  };

  const imageAgentInfo = MulmoScriptMethods.getImageAgentInfo(studio.script);

  // We need to get google's auth token only if the google is the text2image provider.
  if (imageAgentInfo.provider === "google") {
    GraphAILogger.log("google was specified as text2image engine");
    const token = await googleAuth();
    options.config = {
      imageGoogleAgent: {
        projectId: process.env.GOOGLE_PROJECT_ID,
        token,
      },
    };
  }

  GraphAILogger.info(`text2image: provider=${imageAgentInfo.provider} model=${imageAgentInfo.imageParams.model}`);
  const injections: Record<string, Text2ImageAgentInfo | string | MulmoImageParams | MulmoStudioContext | undefined> = {
    context,
    imageAgentInfo,
    outputStudioFilePath: getOutputStudioFilePath(outDirPath, studio.filename),
    imageDirPath,
  };
  const graph = new GraphAI(graph_data, { ...vanillaAgents, imageGoogleAgent, imageOpenaiAgent, fileWriteAgent }, options);
  Object.keys(injections).forEach((key: string) => {
    graph.injectValue(key, injections[key]);
  });
  await graph.run<{ output: MulmoStudioBeat[] }>();
};
