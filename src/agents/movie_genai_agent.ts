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
import { getModelDuration, provider2MovieAgent, AUDIO_MODE_NEVER, AUDIO_MODE_ALWAYS, defaultMovieModel } from "../types/provider2agent.js";
import {
  GEMINI_OMNI_MAX_TOTAL_SEC,
  buildGeminiOmniVideoRequest,
  geminiOmniAspectRatio,
  geminiOmniExtensionPrompt,
  geminiOmniSegments,
  isGeminiOmniVideoModel,
  videoFromInteraction,
  type GeminiOmniImage,
  type GeminiOmniVideoRequest,
} from "../utils/gemini_omni_video.js";

// Per-request timeout so a stalled GenAI video API call rejects instead of hanging.
const GENAI_REQUEST_TIMEOUT_MS = 120_000;
// Wall-clock cap on the long-running video operation poll loop (Veo runs minutes).
const VIDEO_POLL_TIMEOUT_MS = 1_200_000;
// A Gemini Omni call answers synchronously with the whole video (10s at 720p took about 45s).
const GEMINI_OMNI_REQUEST_TIMEOUT_MS = 600_000;

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

type GeminiOmniInteraction = { id?: string; output_video?: { data?: string; mime_type?: string } };

export type GeminiOmniVideoClient = {
  interactions: {
    create: (params: GeminiOmniVideoRequest, options?: { timeout?: number }) => Promise<GeminiOmniInteraction>;
  };
};

export type GeminiOmniVideoInput = {
  model: string;
  prompt: string;
  aspectRatio: string;
  requestedSec: number;
  firstFrame?: GeminiOmniImage;
  lastFrame?: GeminiOmniImage;
};

const isOmniImage = (frame: GeminiOmniImage | undefined): frame is GeminiOmniImage => frame !== undefined;

const nextOmniRequest = (input: GeminiOmniVideoInput, durationSec: number, previous: GeminiOmniInteraction | undefined, frames: GeminiOmniImage[]) => {
  if (!previous) return buildGeminiOmniVideoRequest({ ...input, durationSec, frames });
  if (!previous.id) throw new Error("Gemini Omni returned no interaction id to extend");
  return buildGeminiOmniVideoRequest({ ...input, prompt: geminiOmniExtensionPrompt(input.prompt), durationSec, previousInteractionId: previous.id });
};

// Each call after the first extends the previous interaction's video and answers with the whole video so far.
export const generateGeminiOmniVideo = async (ai: GeminiOmniVideoClient, input: GeminiOmniVideoInput): Promise<Buffer> => {
  const segments = geminiOmniSegments(input.requestedSec);
  const frames = [input.firstFrame, segments.length === 1 ? input.lastFrame : undefined].filter(isOmniImage);
  const last = await segments.reduce<Promise<GeminiOmniInteraction | undefined>>(async (previousPromise, durationSec) => {
    const request = nextOmniRequest(input, durationSec, await previousPromise, frames);
    return ai.interactions.create(request, { timeout: GEMINI_OMNI_REQUEST_TIMEOUT_MS });
  }, Promise.resolve(undefined));
  return videoFromInteraction(last?.output_video);
};

const omniImage = (imagePath: string): GeminiOmniImage => {
  const { imageBytes, mimeType } = loadImageAsBase64(imagePath);
  return { data: imageBytes, mime_type: mimeType };
};

type OmniFrameSources = { imagePath?: string; lastFrameImagePath?: string; referenceImages?: MovieReferenceImage[] };

const omniFrames = (input: Omit<GeminiOmniVideoInput, "firstFrame" | "lastFrame">, { imagePath, lastFrameImagePath, referenceImages }: OmniFrameSources) => {
  if (referenceImages && referenceImages.length > 0) {
    GraphAILogger.warn(`movieGenAIAgent: model ${input.model} does not support referenceImages — ignoring`);
  }
  if (lastFrameImagePath && !imagePath) {
    GraphAILogger.warn(`movieGenAIAgent: lastFrame requires a first frame image (imagePrompt or firstFrameImageName) — ignoring lastFrameImageName`);
  } else if (lastFrameImagePath && geminiOmniSegments(input.requestedSec).length > 1) {
    GraphAILogger.warn(`movieGenAIAgent: lastFrame applies to a single ${input.model} segment — ignoring lastFrameImageName for a ${input.requestedSec}s beat`);
  }
  const lastFrame = lastFrameImagePath && imagePath ? omniImage(lastFrameImagePath) : undefined;
  return { firstFrame: imagePath ? omniImage(imagePath) : undefined, lastFrame };
};

const generateOmniVideoFile = async (
  ai: GeminiOmniVideoClient,
  isVertexAI: boolean,
  input: Omit<GeminiOmniVideoInput, "firstFrame" | "lastFrame">,
  sources: OmniFrameSources,
  movieFile: string,
): Promise<AgentBufferResult> => {
  if (isVertexAI) {
    throw new Error(`Model ${input.model} is supported on the Gemini API only; use veo-3.1-generate-001 with Vertex AI.`, {
      cause: agentGenerationError("movieGenAIAgent", imageAction, unsupportedModelTarget),
    });
  }
  if (input.requestedSec > GEMINI_OMNI_MAX_TOTAL_SEC) {
    GraphAILogger.warn(`movieGenAIAgent: ${input.model} makes at most ${GEMINI_OMNI_MAX_TOTAL_SEC}s — the ${input.requestedSec}s beat gets a shorter video`);
  }
  writeFileSync(movieFile, await generateGeminiOmniVideo(ai, { ...input, ...omniFrames(input, sources) }));
  const predictSec = await probeDurationSec(movieFile);
  return { saved: movieFile, usage: predictSec !== undefined ? { provider: "google", model: input.model, predictSec } : undefined };
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
  const model = params.model ?? defaultMovieModel("google", params);

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

    if (isGeminiOmniVideoModel(model)) {
      const omniInput = { model, prompt, aspectRatio: geminiOmniAspectRatio(params.canvasSize), requestedSec: requestedDuration };
      return generateOmniVideoFile(ai, isVertexAI, omniInput, { imagePath, lastFrameImagePath, referenceImages }, movieFile);
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
