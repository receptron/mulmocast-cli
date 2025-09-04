import fs from "fs";
import { GraphAI, GraphAILogger } from "graphai";
import { getReferenceImagePath, resolveAssetPath } from "../utils/file.js";
import { getExtention } from "../utils/utils.js";

import { graphOption } from "./images.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { MulmoStudioContext, MulmoStudioBeat, MulmoImagePromptMedia } from "../types/index.js";

import { imageOpenaiAgent, mediaMockAgent, imageGenAIAgent } from "../agents/index.js";

// public api
// Application may call this function directly to generate reference image.
export const generateReferenceImage = async (inputs: {
  context: MulmoStudioContext;
  key: string;
  index: number;
  image: MulmoImagePromptMedia;
  force?: boolean;
}) => {
  const { context, key, index, image, force } = inputs;
  const imagePath = getReferenceImagePath(context, key, "png");
  // generate image
  const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(context.presentationStyle);
  const prompt = `${image.prompt}\n${imageAgentInfo.imageParams.style || ""}`;
  GraphAILogger.info(`Generating reference image for ${key}: ${prompt}`);
  const image_graph_data = {
    version: 0.5,
    nodes: {
      imageGenerator: {
        agent: imageAgentInfo.agent,
        retry: 2,
        inputs: {
          media: "image",
          prompt,
          cache: {
            force: [context.force, force ?? false],
            file: imagePath,
            index,
            mulmoContext: context,
            sessionType: "imageReference",
          },
        },
        params: {
          model: imageAgentInfo.imageParams.model,
          canvasSize: context.presentationStyle.canvasSize,
        },
      },
    },
  };

  const options = await graphOption(context);
  const graph = new GraphAI(image_graph_data, { imageGenAIAgent, imageOpenaiAgent, mediaMockAgent }, options);
  await graph.run<{ output: MulmoStudioBeat[] }>();
  return imagePath;
};

const downLoadImage = async (context: MulmoStudioContext, key: string, url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // Detect file extension from Content-Type header or URL
  const extension = getExtention(response.headers.get("content-type"), url);
  const imagePath = getReferenceImagePath(context, key, extension);
  await fs.promises.writeFile(imagePath, buffer);
  return imagePath;
};

export const getImageRefs = async (context: MulmoStudioContext) => {
  const images = context.presentationStyle.imageParams?.images;
  if (!images) {
    return {};
  }
  const imageRefs: Record<string, string> = {};
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, index) => {
        const image = images[key];
        if (image.type === "imagePrompt") {
          imageRefs[key] = await generateReferenceImage({ context, key, index, image, force: false });
        } else if (image.type === "image") {
          if (image.source.kind === "path") {
            imageRefs[key] = resolveAssetPath(context, image.source.path);
          } else if (image.source.kind === "url") {
            imageRefs[key] = await downLoadImage(context, key, image.source.url);
          }
        }
      }),
  );
  return imageRefs;
};
