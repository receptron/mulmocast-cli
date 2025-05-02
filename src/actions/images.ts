import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GraphAI, GraphData } from "graphai";
import type { GraphOptions } from "graphai/lib/type";
import * as agents from "@graphai/agents";
import { MulmoStudio, MulmoStudioBeat, Text2imageParams, FileDirs } from "../types";
import { MulmoScriptMethods } from "../methods";
import { getOutputStudioFilePath, mkdir } from "../utils/file";
import { fileCacheAgentFilter } from "../utils/filters";
import { convertMarkdownToImage } from "../utils/markdown";
import imageGoogleAgent from "../agents/image_google_agent";
import imageOpenaiAgent from "../agents/image_openai_agent";
import { ImageGoogleConfig } from "../agents/image_google_agent";

dotenv.config();
// const openai = new OpenAI();
import { GoogleAuth } from "google-auth-library";

const defaultStyles = [
  "body { margin: 40px; margin-top: 60px; color:#333 }",
  "h1 { font-size: 60px; text-align: center }",
  "ul { margin-left: 40px } ",
  "li { font-size: 48px }",
];

const preprocess_agent = async (namedInputs: { beat: MulmoStudioBeat; index: number; suffix: string; studio: MulmoStudio; imageDirPath: string }) => {
  const { beat, index, suffix, studio, imageDirPath } = namedInputs;
  const imageParams = { ...studio.script.imageParams, ...beat.imageParams };
  const prompt = (beat.imagePrompt || beat.text) + "\n" + (imageParams.style || "");
  const imagePath = path.resolve(`${imageDirPath}/${studio.filename}/${index}${suffix}.png`);

  if (beat.media) {
    if (beat.media.type === "textSlide") {
      const slide = beat.media.slide;
      const markdown: string = `# ${slide.title}` + slide.bullets.map((text) => `- ${text}`).join("\n");
      // NOTE: If we want to support per-beat CSS style, we need to add textSlideParams to MulmoBeat and process it here.
      await convertMarkdownToImage(markdown, studio.script.textSlideParams?.cssStyles ?? defaultStyles, imagePath);
    }
  }
  const aspectRatio = MulmoScriptMethods.getAspectRatio(studio.script);
  return { path: imagePath, prompt, imageParams, aspectRatio };
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 2,
  nodes: {
    studio: {},
    imageDirPath: {},
    text2imageAgent: { value: "" },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":studio.beats", studio: ":studio", text2imageAgent: ":text2imageAgent", imageDirPath: ":imageDirPath" },
      isResult: true,
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: {
        nodes: {
          preprocessor: {
            agent: preprocess_agent,
            inputs: {
              beat: ":beat",
              index: ":__mapIndex",
              studio: ":studio",
              suffix: "p",
              imageDirPath: ":imageDirPath",
            },
          },
          imageGenerator: {
            agent: ":text2imageAgent",
            params: {
              model: ":preprocessor.imageParams.model",
              size: ":preprocessor.imageParams.size",
              aspectRatio: ":preprocessor.aspectRatio",
            },
            inputs: {
              prompt: ":preprocessor.prompt",
              file: ":preprocessor.path", // only for fileCacheAgentFilter
              text: ":preprocessor.prompt", // only for fileCacheAgentFilter
            },
          },
          output: {
            agent: "copyAgent",
            inputs: {
              result: ":imageGenerator",
              image: ":preprocessor.path",
            },
            output: {
              image: ".image",
            },
            isResult: true,
          },
        },
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

export const images = async (studio: MulmoStudio, files: FileDirs) => {
  const { outDirPath, imageDirPath } = files;
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

  const injections: Record<string, string | MulmoStudio | Text2imageParams | undefined> = {
    studio: studio,
    text2imageAgent: "imageOpenaiAgent",
  };

  // We need to get google's auth token only if the google is the text2image provider.
  if (studio.script.imageParams?.provider === "google") {
    console.log("google was specified as text2image engine");
    const google_config: ImageGoogleConfig = {
      projectId: process.env.GOOGLE_PROJECT_ID,
      token: "",
    };
    google_config.token = await googleAuth();
    options.config = {
      imageGoogleAgent: google_config,
    };
    injections.text2image = "imageGoogleAgent";
  }

  const graph = new GraphAI(graph_data, { ...agents, imageGoogleAgent, imageOpenaiAgent }, options);
  Object.keys(injections).forEach((key: string) => {
    graph.injectValue(key, injections[key]);
  });
  graph.injectValue("imageDirPath", imageDirPath);
  const results = await graph.run<{ output: MulmoStudioBeat[] }>();

  if (results.map?.output) {
    // THe output looks like this. We need to merge it into MultiStudioBeat array
    // [
    //  { image: '/Users/satoshi/git/ai/mulmo/images/test_en/0p.png' },
    //  { image: '/Users/satoshi/git/ai/mulmo/images/test_en/1p.png' }
    // ]
    results.map?.output.forEach((update, index) => {
      const beat = studio.beats[index];
      studio.beats[index] = { ...beat, ...update };
    });
    const outputStudioFilePath = getOutputStudioFilePath(outDirPath, studio.filename);
    fs.writeFileSync(outputStudioFilePath, JSON.stringify(studio, null, 2));
  }
};
