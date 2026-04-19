import { GraphAI, GraphAILogger } from "graphai";
import { getReferenceImagePath } from "../utils/file.js";

import { imageGraphOption } from "./graph_option.js";
import { MulmoPresentationStyleMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import {
  MulmoStudioContext,
  MulmoStudioBeat,
  MulmoBeat,
  MulmoImagePromptMedia,
  MulmoMoviePromptMedia,
  MulmoMediaSource,
  MulmoImageParamsImagesValue,
} from "../types/index.js";

import { imageOpenaiAgent, mediaMockAgent, imageGenAIAgent, imageReplicateAgent, movieGenAIAgent, movieReplicateAgent } from "../agents/index.js";
import { agentGenerationError, imageReferenceAction, imageFileTarget, movieFileTarget } from "../utils/error_cause.js";

// public api
// Application may call this function directly to generate reference image.
export const generateReferenceImage = async (inputs: {
  context: MulmoStudioContext;
  key: string;
  index: number;
  image: MulmoImagePromptMedia;
  referenceImagePath?: string;
  force?: boolean;
}) => {
  const { context, key, index, image, referenceImagePath, force } = inputs;
  const imagePath = getReferenceImagePath(context, key, "png");
  // generate image
  const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(context.presentationStyle);
  const prompt = `${image.prompt}\n${imageAgentInfo.imageParams.style || ""}`;
  GraphAILogger.info(`Generating reference image for ${key}: ${prompt}`);
  const referenceImages = referenceImagePath ? [referenceImagePath] : undefined;
  const image_graph_data = {
    version: 0.5,
    nodes: {
      imageGenerator: {
        agent: imageAgentInfo.agent,
        retry: 2,
        inputs: {
          media: "image",
          prompt,
          referenceImages,
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
          canvasSize: image.canvasSize ?? context.presentationStyle.canvasSize,
        },
      },
    },
  };

  try {
    const options = await imageGraphOption(context);
    const graph = new GraphAI(image_graph_data, { imageGenAIAgent, imageOpenaiAgent, mediaMockAgent, imageReplicateAgent }, options);
    await graph.run<{ output: MulmoStudioBeat[] }>();
    return imagePath;
  } catch (error) {
    GraphAILogger.error(error);
    throw new Error(`generateReferenceImage: generate error: key=${key}`, {
      cause: agentGenerationError(imageAgentInfo.agent, imageReferenceAction, imageFileTarget),
    });
  }
};

export type MediaRefs = {
  imageRefs: Record<string, string>;
  movieRefs: Record<string, string>;
};

export const getMediaRefs = async (context: MulmoStudioContext): Promise<MediaRefs> => {
  const images = context.presentationStyle.imageParams?.images;
  if (!images) {
    return { imageRefs: {}, movieRefs: {} };
  }
  const imageRefs: Record<string, string> = {};
  const movieRefs: Record<string, string> = {};

  // Stage 1: resolve non-referencing entries (image, imagePrompt without referenceImageName, movie)
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, index) => {
        const image = images[key];
        if (image.type === "imagePrompt" && !image.referenceImageName) {
          const refPath = image.referenceImage ? await MulmoMediaSourceMethods.imageReference(image.referenceImage, context, key) : undefined;
          imageRefs[key] = await generateReferenceImage({ context, key, index, image, referenceImagePath: refPath, force: false });
        } else if (image.type === "image") {
          imageRefs[key] = await MulmoMediaSourceMethods.imageReference(image.source, context, key);
        } else if (image.type === "movie") {
          movieRefs[key] = await resolveMovieReference(image, context, key);
        }
      }),
  );

  // Stage 2: resolve imagePrompt with referenceImageName (depends on Stage 1 results)
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, index) => {
        const image = images[key];
        if (image.type === "imagePrompt" && image.referenceImageName) {
          const refPath = imageRefs[image.referenceImageName];
          if (!refPath) {
            GraphAILogger.warn(`imagePrompt "${key}": referenceImageName "${image.referenceImageName}" not found in imageRefs — generating without reference`);
          }
          imageRefs[key] = await generateReferenceImage({ context, key, index, image, referenceImagePath: refPath, force: false });
        }
      }),
  );

  return { imageRefs, movieRefs };
};

const resolveMovieReference = async (media: { source: MulmoMediaSource }, context: MulmoStudioContext, key: string) => {
  return MulmoMediaSourceMethods.imageReference(media.source, context, key);
};

const generateReferenceMovie = async (inputs: {
  context: MulmoStudioContext;
  key: string;
  index: number;
  moviePrompt: MulmoMoviePromptMedia;
  imagePath?: string;
}) => {
  const { context, key, index, moviePrompt, imagePath } = inputs;
  const moviePath = getReferenceImagePath(context, key, "mp4");
  const movieAgentInfo = MulmoPresentationStyleMethods.getMovieAgentInfo(context.presentationStyle);
  GraphAILogger.info(`Generating reference movie for ${key}: ${moviePrompt.prompt}`);
  const movie_graph_data = {
    version: 0.5,
    nodes: {
      movieGenerator: {
        agent: movieAgentInfo.agent,
        inputs: {
          media: "movie",
          prompt: moviePrompt.prompt,
          imagePath: imagePath ?? null,
          movieFile: moviePath,
          cache: {
            force: [context.force],
            file: moviePath,
            index,
            id: key,
            mulmoContext: context,
            sessionType: "imageReference",
          },
        },
        params: {
          model: movieAgentInfo.movieParams.model,
          canvasSize: context.presentationStyle.canvasSize,
          generateAudio: movieAgentInfo.movieParams.generateAudio,
        },
      },
    },
  };

  try {
    const options = await imageGraphOption(context);
    const graph = new GraphAI(movie_graph_data, { movieGenAIAgent, movieReplicateAgent, mediaMockAgent }, options);
    await graph.run<{ output: MulmoStudioBeat[] }>();
    return moviePath;
  } catch (error) {
    GraphAILogger.error(error);
    throw new Error(`generateReferenceMovie: generate error: key=${key}`, {
      cause: agentGenerationError(movieAgentInfo.agent, imageReferenceAction, movieFileTarget),
    });
  }
};

const resolveLocalRefs = async (
  context: MulmoStudioContext,
  images: Record<string, MulmoImageParamsImagesValue>,
  beatIndex: number,
  globalImageRefs: Record<string, string>,
) => {
  const localImageRefs: Record<string, string> = {};
  const localMovieRefs: Record<string, string> = {};

  // Stage 1: image, imagePrompt (without referenceImageName), movie (parallel)
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, i) => {
        const entry = images[key];
        if (entry.type === "imagePrompt" && !entry.referenceImageName) {
          const refPath = entry.referenceImage ? await MulmoMediaSourceMethods.imageReference(entry.referenceImage, context, key) : undefined;
          localImageRefs[key] = await generateReferenceImage({
            context,
            key,
            index: beatIndex * 100 + i,
            image: entry,
            referenceImagePath: refPath,
          });
        } else if (entry.type === "image") {
          localImageRefs[key] = await MulmoMediaSourceMethods.imageReference(entry.source, context, key);
        } else if (entry.type === "movie") {
          localMovieRefs[key] = await resolveMovieReference(entry, context, key);
        }
      }),
  );

  // Stage 2: imagePrompt with referenceImageName (depends on Stage 1)
  const combinedImageRefsForImagePrompt = { ...globalImageRefs, ...localImageRefs };
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, i) => {
        const entry = images[key];
        if (entry.type === "imagePrompt" && entry.referenceImageName) {
          const refPath = combinedImageRefsForImagePrompt[entry.referenceImageName];
          if (!refPath) {
            GraphAILogger.warn(`imagePrompt "${key}": referenceImageName "${entry.referenceImageName}" not found — generating without reference`);
          }
          localImageRefs[key] = await generateReferenceImage({
            context,
            key,
            index: beatIndex * 100 + i,
            image: entry,
            referenceImagePath: refPath,
          });
        }
      }),
  );

  // Stage 3: moviePrompt (imageName references imageRefs only)
  const combinedImageRefs = { ...globalImageRefs, ...localImageRefs };
  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, i) => {
        const entry = images[key];
        if (entry.type === "moviePrompt") {
          const refImagePath = entry.imageName ? combinedImageRefs[entry.imageName] : undefined;
          localMovieRefs[key] = await generateReferenceMovie({
            context,
            key,
            index: beatIndex * 100 + i,
            moviePrompt: entry,
            imagePath: refImagePath,
          });
        }
      }),
  );

  return { localImageRefs, localMovieRefs };
};

export const resolveBeatLocalRefs = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  imageRefs: Record<string, string>;
  movieRefs: Record<string, string>;
}): Promise<MediaRefs> => {
  const { context, beat, index, imageRefs, movieRefs } = namedInputs;
  const images = beat.images;
  if (!images) {
    return { imageRefs, movieRefs };
  }

  const { localImageRefs, localMovieRefs } = await resolveLocalRefs(context, images, index, imageRefs);
  return {
    imageRefs: { ...imageRefs, ...localImageRefs },
    movieRefs: { ...movieRefs, ...localMovieRefs },
  };
};

/** @deprecated Use getMediaRefs instead */
export const getImageRefs = async (context: MulmoStudioContext) => {
  const { imageRefs } = await getMediaRefs(context);
  return imageRefs;
};
