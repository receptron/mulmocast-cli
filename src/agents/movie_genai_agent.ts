import { readFileSync, writeFileSync } from "fs";
import { GraphAILogger, sleep } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { GoogleGenAI, PersonGeneration, VideoGenerationReferenceType } from "@google/genai";
import type { GenerateVideosOperation, GenerateVideosResponse, Video as GenAIVideo } from "@google/genai";
import {
  apiKeyMissingError,
  agentGenerationError,
  agentInvalidResponseError,
  imageAction,
  movieFileTarget,
  videoDurationTarget,
  unsupportedModelTarget,
  hasCause,
} from "../utils/error_cause.js";
import { getAspectRatio } from "../utils/utils.js";
import { ffmpegGetMediaDuration } from "../utils/ffmpeg_utils.js";
import { ASPECT_RATIOS } from "../types/const.js";
import type { AgentBufferResult, GenAIImageAgentConfig, GoogleMovieAgentParams, MovieAgentInputs, MovieReferenceImage } from "../types/agent.js";
import type { AgentUsage } from "../types/usage.js";
import { getModelDuration, provider2MovieAgent, AUDIO_MODE_NEVER, AUDIO_MODE_ALWAYS } from "../types/provider2agent.js";

// Per-request timeout so a stalled GenAI video API call rejects instead of hanging.
const GENAI_REQUEST_TIMEOUT_MS = 120_000;
// Wall-clock cap on the long-running video operation poll loop (Veo runs minutes).
const VIDEO_POLL_TIMEOUT_MS = 1_200_000;

type ImagePayload = { imageBytes: string; mimeType: string };

type VideoPayload = {
  model: string;
  prompt: string;
  config: {
    aspectRatio: string;
    resolution?: string;
    numberOfVideos?: number;
    durationSeconds?: number;
    personGeneration?: PersonGeneration;
    lastFrame?: ImagePayload;
    referenceImages?: Array<{ image: ImagePayload; referenceType: VideoGenerationReferenceType }>;
  };
  image?: ImagePayload;
  video?: { uri: string };
};

const pollUntilDone = async (ai: GoogleGenAI, operation: GenerateVideosOperation) => {
  const response = { operation };
  const deadline = Date.now() + VIDEO_POLL_TIMEOUT_MS;
  while (!response.operation.done) {
    if (Date.now() > deadline) {
      throw new Error(`Video generation did not complete within ${VIDEO_POLL_TIMEOUT_MS}ms`, {
        cause: agentGenerationError("movieGenAIAgent", imageAction, movieFileTarget),
      });
    }
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

const loadImageAsBase64 = (imagePath: string): ImagePayload => {
  const buffer = readFileSync(imagePath);
  return {
    imageBytes: buffer.toString("base64"),
    mimeType: "image/png",
  };
};

// Veo bills per second of generated video. The SDK response carries no usage
// metadata (GenerateVideosResponse only has generatedVideos and RAI flags), so
// we ffprobe the downloaded file to get the actual duration. Falls back to
// undefined if ffprobe fails, which lets the billing layer use the requested
// duration as a fallback.
const probeDurationSec = async (movieFile: string): Promise<number | undefined> => {
  try {
    const { duration } = await ffmpegGetMediaDuration(movieFile);
    return duration > 0 ? duration : undefined;
  } catch (e) {
    GraphAILogger.warn("movieGenAIAgent: ffprobe failed, predictSec will be omitted", e);
    return undefined;
  }
};

const downloadVideo = async (ai: GoogleGenAI, video: GenAIVideo, movieFile: string, isVertexAI: boolean, model: string): Promise<AgentBufferResult> => {
  if (isVertexAI) {
    // Vertex AI returns videoBytes directly
    writeFileSync(movieFile, Buffer.from(video.videoBytes!, "base64"));
  } else {
    // Gemini API requires download via uri
    await ai.files.download({
      file: video,
      downloadPath: movieFile,
    });
    await sleep(5000); // HACK: Without this, the file is not ready yet.
  }
  const predictSec = await probeDurationSec(movieFile);
  const usage: AgentUsage | undefined = predictSec !== undefined ? { provider: "google", model, predictSec } : undefined;
  return { saved: movieFile, usage };
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
  isVertexAI: boolean,
): Promise<AgentBufferResult> => {
  const initialDuration = 8;
  const maxExtensionDuration = 8;
  const extensionsNeeded = Math.ceil((requestedDuration - initialDuration) / maxExtensionDuration);

  GraphAILogger.info(`Veo 3.1 video extension: ${extensionsNeeded} extensions needed for ${requestedDuration}s target`);

  const generateIteration = async (
    iteration: number,
    accumulatedDuration: number,
    previousVideo?: GenAIVideo,
  ): Promise<{ video: GenAIVideo; duration: number }> => {
    const isInitial = iteration === 0;
    const remainingDuration = requestedDuration - accumulatedDuration;
    const extensionDuration = isInitial ? initialDuration : (getModelDuration("google", model, remainingDuration) ?? maxExtensionDuration);

    const getSource = () => {
      if (isInitial) return imagePath ? { image: loadImageAsBase64(imagePath) } : undefined;
      return previousVideo?.uri ? { video: { uri: previousVideo.uri } } : undefined;
    };

    const payload = createVeo31Payload(model, prompt, aspectRatio, getSource());

    GraphAILogger.info(
      isInitial ? "Generating initial 8s video..." : `Extending video: iteration ${iteration}/${extensionsNeeded} (+${extensionDuration}s)...`,
    );

    const operation = await ai.models.generateVideos(payload);
    const response = await pollUntilDone(ai, operation);
    const video = getVideoFromResponse(response, iteration);

    const totalDuration = accumulatedDuration + extensionDuration;
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

  return downloadVideo(ai, result.video, movieFile, isVertexAI, model);
};

const generateStandardVideo = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio: string,
  imagePath: string | undefined,
  lastFrameImagePath: string | undefined,
  referenceImages: MovieReferenceImage[] | undefined,
  duration: number | undefined,
  movieFile: string,
  isVertexAI: boolean,
): Promise<AgentBufferResult> => {
  const capabilities = provider2MovieAgent.google.modelParams[model];
  const payload: VideoPayload = {
    model,
    prompt,
    config: {
      durationSeconds: capabilities?.supportsDuration === false ? undefined : duration,
      aspectRatio,
      personGeneration: imagePath || !capabilities?.supportsPersonGeneration ? undefined : PersonGeneration.ALLOW_ALL,
    },
    image: imagePath ? loadImageAsBase64(imagePath) : undefined,
  };

  // Validate and apply lastFrame
  if (lastFrameImagePath) {
    if (!capabilities?.supportsLastFrame) {
      GraphAILogger.warn(`movieGenAIAgent: model ${model} does not support lastFrame — ignoring lastFrameImageName`);
    } else if (!imagePath) {
      GraphAILogger.warn(`movieGenAIAgent: lastFrame requires a first frame image (imagePrompt or firstFrameImageName) — ignoring lastFrameImageName`);
    } else {
      payload.config.lastFrame = loadImageAsBase64(lastFrameImagePath);
    }
  }

  // Validate and apply referenceImages (mutually exclusive with image/lastFrame)
  if (referenceImages && referenceImages.length > 0) {
    if (!capabilities?.supportsReferenceImages) {
      GraphAILogger.warn(`movieGenAIAgent: model ${model} does not support referenceImages — ignoring`);
    } else if (imagePath) {
      GraphAILogger.warn(`movieGenAIAgent: referenceImages cannot be combined with first frame image — ignoring referenceImages`);
    } else if (lastFrameImagePath) {
      GraphAILogger.warn(`movieGenAIAgent: referenceImages cannot be combined with lastFrame — ignoring referenceImages`);
    } else {
      payload.config.referenceImages = referenceImages.map((ref) => ({
        image: loadImageAsBase64(ref.imagePath),
        referenceType: ref.referenceType as VideoGenerationReferenceType,
      }));
    }
  }

  const operation = await ai.models.generateVideos(payload);
  const response = await pollUntilDone(ai, operation);
  const video = getVideoFromResponse(response);

  return downloadVideo(ai, video, movieFile, isVertexAI, model);
};

export const movieGenAIAgent: AgentFunction<GoogleMovieAgentParams, AgentBufferResult, MovieAgentInputs, GenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, imagePath, lastFrameImagePath, referenceImages, movieFile } = namedInputs;
  const aspectRatio = getAspectRatio(params.canvasSize, ASPECT_RATIOS);
  const model = params.model ?? provider2MovieAgent.google.defaultModel;

  const apiKey = config?.apiKey;

  try {
    const requestedDuration = params.duration ?? 8;
    const duration = getModelDuration("google", model, requestedDuration);
    if (duration === undefined) {
      throw new Error(`Duration ${requestedDuration} is not supported for model ${model}.`, {
        cause: agentGenerationError("movieGenAIAgent", imageAction, videoDurationTarget),
      });
    }

    // Check generateAudio compatibility (Google API has no toggle)
    if (params.generateAudio !== undefined) {
      const audio = provider2MovieAgent.google.modelParams[model]?.audio ?? { mode: AUDIO_MODE_NEVER };
      if (audio.mode === AUDIO_MODE_NEVER && params.generateAudio === true) {
        throw new Error(`Model ${model} does not support audio generation`, {
          cause: agentGenerationError("movieGenAIAgent", imageAction, unsupportedModelTarget),
        });
      } else if (audio.mode === AUDIO_MODE_ALWAYS && params.generateAudio === false) {
        GraphAILogger.warn(`movieGenAIAgent: model ${model} always generates audio — ignoring generateAudio=false`);
      }
    }

    const isVertexAI = !!params.vertexai_project;
    const ai = isVertexAI
      ? new GoogleGenAI({
          vertexai: true,
          project: params.vertexai_project,
          location: params.vertexai_location ?? "us-central1",
          httpOptions: { timeout: GENAI_REQUEST_TIMEOUT_MS },
        })
      : (() => {
          if (!apiKey) {
            throw new Error(
              "Google GenAI authentication is required. Either set GEMINI_API_KEY (Gemini API) or specify movieParams.vertexai_project (Vertex AI). See docs/vertexai_en.md or docs/vertexai_ja.md.",
              {
                cause: apiKeyMissingError("movieGenAIAgent", imageAction, "GEMINI_API_KEY"),
              },
            );
          }
          return new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_REQUEST_TIMEOUT_MS } });
        })();

    // Veo 3.1: Video extension mode for videos longer than 8s
    if (model === "veo-3.1-generate-preview" && requestedDuration > 8 && params.canvasSize) {
      return generateExtendedVideo(ai, model, prompt, aspectRatio, imagePath, requestedDuration, movieFile, isVertexAI);
    }

    // Standard mode
    return generateStandardVideo(ai, model, prompt, aspectRatio, imagePath, lastFrameImagePath, referenceImages, duration, movieFile, isVertexAI);
  } catch (error) {
    if (hasCause(error) && error.cause) {
      throw error;
    }
    GraphAILogger.info("Failed to generate movie:", (error as Error).message);
    // Preserve the underlying message (e.g. a timeout/abort deadline) instead of
    // collapsing every failure to a static label. (Same template as #1452.)
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate movie with Google GenAI: ${detail}`, {
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
