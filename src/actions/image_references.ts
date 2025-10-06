import { GraphAI, GraphAILogger } from "graphai";
import { getReferenceImagePath } from "../utils/file.js";

import { graphOption } from "./images.js";
import { MulmoPresentationStyleMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import { MulmoStudioContext, MulmoStudioBeat, MulmoImagePromptMedia } from "../types/index.js";

import { imageOpenaiAgent, mediaMockAgent, imageGenAIAgent, imageReplicateAgent } from "../agents/index.js";
import { agentGenerationError, imageReferenceAction, imageFileTarget } from "../utils/error_cause.js";

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
            id: key,
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

  try {
    const options = await graphOption(context);
    const graph = new GraphAI(image_graph_data, { imageGenAIAgent, imageOpenaiAgent, mediaMockAgent, imageReplicateAgent }, options);
    await graph.run<{ output: MulmoStudioBeat[] }>();
    return imagePath;
  } catch (error) {
    GraphAILogger.error(error);
    throw new Error(`generateReferenceImage: generate error: key=${key}`, {
      cause: agentGenerationError("imageReference", imageReferenceAction, imageFileTarget),
    });
  }
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
          imageRefs[key] = await MulmoMediaSourceMethods.imageReference(image.source, context, key);
        }
      }),
  );
  return imageRefs;
};
