import { GraphAI, GraphAILogger } from "graphai";
import { getReferenceImagePath } from "../utils/file.js";

import { graphOption } from "./images.js";
import { MulmoPresentationStyleMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import { MulmoStudioContext, MulmoStudioBeat, MulmoImagePromptMedia, MulmoMovieMedia, MulmoMoviePromptMedia } from "../types/index.js";

import { imageOpenaiAgent, mediaMockAgent, imageGenAIAgent, imageReplicateAgent, movieReplicateAgent, movieGenAIAgent } from "../agents/index.js";
import { agentGenerationError, imageReferenceAction, imageFileTarget, movieFileTarget } from "../utils/error_cause.js";

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
          canvasSize: image.canvasSize ?? context.presentationStyle.canvasSize,
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
      cause: agentGenerationError(imageAgentInfo.agent, imageReferenceAction, imageFileTarget),
    });
  }
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
          imagePath: imagePath ?? undefined,
          movieFile: moviePath,
          cache: {
            force: context.force,
            file: moviePath,
            index,
            id: key,
            mulmoContext: context,
            sessionType: "movieReference",
          },
          params: {
            model: movieAgentInfo.movieParams?.model,
            canvasSize: context.presentationStyle.canvasSize,
          },
        },
      },
    },
  };

  try {
    const options = await graphOption(context);
    const graph = new GraphAI(movie_graph_data, { movieReplicateAgent, movieGenAIAgent, mediaMockAgent }, options);
    await graph.run();
    return moviePath;
  } catch (error) {
    GraphAILogger.error(error);
    throw new Error(`generateReferenceMovie: generate error: key=${key}`, {
      cause: agentGenerationError(movieAgentInfo.agent, imageReferenceAction, movieFileTarget),
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

  // Stage 1: Resolve image and imagePrompt (and movie file refs) in parallel
  const imageRefs: Record<string, string> = {};
  const movieRefs: Record<string, string> = {};
  const moviePromptEntries: [string, MulmoMoviePromptMedia, number][] = [];

  await Promise.all(
    Object.keys(images)
      .sort()
      .map(async (key, index) => {
        const entry = images[key];
        if (entry.type === "imagePrompt") {
          imageRefs[key] = await generateReferenceImage({ context, key, index, image: entry, force: false });
        } else if (entry.type === "image") {
          imageRefs[key] = await MulmoMediaSourceMethods.imageReference(entry.source, context, key);
        } else if (entry.type === "movie") {
          movieRefs[key] = await resolveMovieReference(entry, context, key);
        } else if (entry.type === "moviePrompt") {
          moviePromptEntries.push([key, entry, index]);
        }
      }),
  );

  // Stage 2: Resolve moviePrompt entries (may depend on imageRefs via imageName)
  await Promise.all(
    moviePromptEntries.map(async ([key, moviePrompt, index]) => {
      const imagePath = moviePrompt.imageName ? imageRefs[moviePrompt.imageName] : undefined;
      if (moviePrompt.imageName && !imagePath) {
        throw new Error(`moviePrompt "${key}" references imageName "${moviePrompt.imageName}" but it was not found in imageRefs`);
      }
      movieRefs[key] = await generateReferenceMovie({ context, key, index, moviePrompt, imagePath });
    }),
  );

  return { imageRefs, movieRefs };
};

const resolveMovieReference = async (movie: MulmoMovieMedia, context: MulmoStudioContext, key: string) => {
  return MulmoMediaSourceMethods.imageReference(movie.source, context, key);
};

/** @deprecated Use getMediaRefs instead */
export const getImageRefs = async (context: MulmoStudioContext) => {
  const { imageRefs } = await getMediaRefs(context);
  return imageRefs;
};
