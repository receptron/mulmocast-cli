import { readFileSync } from "fs";
import { GraphAILogger, sleep } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { GoogleGenAI, PersonGeneration } from "@google/genai";
import type { GenerateVideosOperation, GenerateVideosResponse, Video as GenAIVideo } from "@google/genai";
import {
  apiKeyMissingError,
  agentGenerationError,
  agentInvalidResponseError,
  imageAction,
  movieFileTarget,
  videoDurationTarget,
  hasCause,
} from "../utils/error_cause.js";
import type { AgentBufferResult, GenAIImageAgentConfig, GoogleMovieAgentParams, MovieAgentInputs } from "../types/agent.js";
import { getModelDuration, provider2MovieAgent } from "../utils/provider2agent.js";

export const getAspectRatio = (canvasSize: { width: number; height: number }): string => {
  if (canvasSize.width > canvasSize.height) {
    return "16:9";
  } else if (canvasSize.width < canvasSize.height) {
    return "9:16";
  } else {
    return "1:1";
  }
};

type VideoPayload = {
  model: string;
  prompt: string;
  config: {
    aspectRatio: string;
    resolution?: string;
    numberOfVideos?: number;
    durationSeconds?: number;
    personGeneration?: PersonGeneration;
  };
  image?: { imageBytes: string; mimeType: string };
  video?: { uri: string };
};

const pollUntilDone = async (ai: GoogleGenAI, operation: GenerateVideosOperation) => {
  const response = { operation };
  while (!response.operation.done) {
    await sleep(5000);
    response.operation = await ai.operations.getVideosOperation(response);
  }
  return response;
};

const getVideoFromResponse = (response: { operation: GenerateVideosOperation & { response?: GenerateVideosResponse } }, iteration?: number): GenAIVideo => {
  const iterationInfo = iteration !== undefined ? ` in iteration ${iteration}` : "";
  if (!response.operation.response?.generatedVideos) {
    throw new Error(`No video${iterationInfo}: ${JSON.stringify(response.operation, null, 2)}`, {
      cause: agentInvalidResponseError("movieGenAIAgent", imageAction, movieFileTarget),
    });
  }
  const video = response.operation.response.generatedVideos[0].video;
  if (!video) {
    throw new Error(`No video${iterationInfo}`, {
      cause: agentInvalidResponseError("movieGenAIAgent", imageAction, movieFileTarget),
    });
  }
  return video;
};

const loadImageAsBase64 = (imagePath: string): { imageBytes: string; mimeType: string } => {
  const buffer = readFileSync(imagePath);
  return {
    imageBytes: buffer.toString("base64"),
    mimeType: "image/png",
  };
};

const downloadVideo = async (ai: GoogleGenAI, video: GenAIVideo, movieFile: string): Promise<AgentBufferResult> => {
  await ai.files.download({
    file: video,
    downloadPath: movieFile,
  });
  await sleep(5000); // HACK: Without this, the file is not ready yet.
  return { saved: movieFile };
};

const createVeo31Payload = (
  model: string,
  prompt: string,
  aspectRatio: string,
  source?: { image?: { imageBytes: string; mimeType: string }; video?: { uri: string } },
): VideoPayload => ({
  model,
  prompt,
  config: {
    aspectRatio,
    resolution: "720p",
    numberOfVideos: 1,
  },
  ...source,
});

const generateExtendedVideo = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio: string,
  imagePath: string | undefined,
  requestedDuration: number,
  movieFile: string,
): Promise<AgentBufferResult> => {
  const MAX_VEO31_DURATION = 148; // Veo 3.1 maximum output duration
  const INITIAL_DURATION = 8; // First video is 8s
  const EXTENSION_OVERLAP = 1; // Each 8s extension adds 7s (1s overlap)
  const ACTUAL_EXTENSION = 7; // Net extension per iteration

  if (requestedDuration > MAX_VEO31_DURATION) {
    throw new Error(`Requested duration ${requestedDuration}s exceeds Veo 3.1 maximum of ${MAX_VEO31_DURATION}s`, {
      cause: agentGenerationError("movieGenAIAgent", imageAction, videoDurationTarget),
    });
  }

  const extensionsNeeded = Math.ceil((requestedDuration - INITIAL_DURATION) / ACTUAL_EXTENSION);

  GraphAILogger.info(`Veo 3.1 video extension: ${extensionsNeeded} extensions needed for ${requestedDuration}s target (7s net per extension)`);

  const generateIteration = async (
    iteration: number,
    accumulatedDuration: number,
    previousVideo?: GenAIVideo,
  ): Promise<{ video: GenAIVideo; duration: number }> => {
    const isInitial = iteration === 0;
    const remainingDuration = requestedDuration - accumulatedDuration;

    // For extensions: always generate 8s video, but only 7s is added (1s overlap)
    const generationDuration = isInitial ? INITIAL_DURATION : (getModelDuration("google", model, remainingDuration + EXTENSION_OVERLAP) ?? 8);
    const actualExtension = isInitial ? INITIAL_DURATION : Math.min(remainingDuration, ACTUAL_EXTENSION);

    const getSource = () => {
      if (isInitial) return imagePath ? { image: loadImageAsBase64(imagePath) } : undefined;
      return previousVideo?.uri ? { video: { uri: previousVideo.uri } } : undefined;
    };

    const payload = createVeo31Payload(model, prompt, aspectRatio, getSource());

    GraphAILogger.info(
      isInitial
        ? "Generating initial 8s video..."
        : `Extending video: iteration ${iteration}/${extensionsNeeded} (generating ${generationDuration}s, adding ${actualExtension}s)...`,
    );

    const operation = await ai.models.generateVideos(payload);
    const response = await pollUntilDone(ai, operation);
    const video = getVideoFromResponse(response, iteration);

    const totalDuration = accumulatedDuration + actualExtension;
    GraphAILogger.info(`Video ${isInitial ? "generated" : "extended"}: ~${totalDuration}s total`);

    return { video, duration: totalDuration };
  };

  const result = await Array.from({ length: extensionsNeeded + 1 }).reduce<Promise<{ video?: GenAIVideo; duration: number }>>(
    async (prev, _, index) => {
      const { video, duration } = await prev;
      return generateIteration(index, duration, video);
    },
    Promise.resolve({ video: undefined, duration: 0 }),
  );

  if (!result.video) {
    throw new Error("Failed to generate extended video", {
      cause: agentInvalidResponseError("movieGenAIAgent", imageAction, movieFileTarget),
    });
  }

  return downloadVideo(ai, result.video, movieFile);
};

const generateStandardVideo = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio: string,
  imagePath: string | undefined,
  duration: number | undefined,
  movieFile: string,
): Promise<AgentBufferResult> => {
  const isVeo3 = model === "veo-3.0-generate-001" || model === "veo-3.1-generate-preview";
  const payload: VideoPayload = {
    model,
    prompt,
    config: {
      durationSeconds: isVeo3 ? undefined : duration,
      aspectRatio,
      personGeneration: imagePath ? undefined : PersonGeneration.ALLOW_ALL,
    },
    image: imagePath ? loadImageAsBase64(imagePath) : undefined,
  };

  const operation = await ai.models.generateVideos(payload);
  const response = await pollUntilDone(ai, operation);
  const video = getVideoFromResponse(response);

  return downloadVideo(ai, video, movieFile);
};

export const movieGenAIAgent: AgentFunction<GoogleMovieAgentParams, AgentBufferResult, MovieAgentInputs, GenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, imagePath, movieFile } = namedInputs;
  const aspectRatio = getAspectRatio(params.canvasSize);
  const model = params.model ?? provider2MovieAgent.google.defaultModel;

  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Google GenAI API key is required (GEMINI_API_KEY)", {
      cause: apiKeyMissingError("movieGenAIAgent", imageAction, "GEMINI_API_KEY"),
    });
  }

  try {
    const requestedDuration = params.duration ?? 8;
    const duration = getModelDuration("google", model, requestedDuration);
    if (duration === undefined) {
      throw new Error(`Duration ${requestedDuration} is not supported for model ${model}.`, {
        cause: agentGenerationError("movieGenAIAgent", imageAction, videoDurationTarget),
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Veo 3.1: Video extension mode for videos longer than 8s
    if (model === "veo-3.1-generate-preview" && requestedDuration > 8 && params.canvasSize) {
      return generateExtendedVideo(ai, model, prompt, aspectRatio, imagePath, requestedDuration, movieFile);
    }

    // Standard mode
    return generateStandardVideo(ai, model, prompt, aspectRatio, imagePath, duration, movieFile);
  } catch (error) {
    GraphAILogger.info("Failed to generate movie:", (error as Error).message);
    if (hasCause(error) && error.cause) {
      throw error;
    }
    throw new Error("Failed to generate movie with Google GenAI", {
      cause: agentGenerationError("movieGenAIAgent", imageAction, movieFileTarget),
    });
  }
};

const movieGenAIAgentInfo: AgentFunctionInfo = {
  name: "movieGenAIAgent",
  agent: movieGenAIAgent,
  mock: movieGenAIAgent,
  samples: [],
  description: "Google Movie agent",
  category: ["movie"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: [],
};

export default movieGenAIAgentInfo;
