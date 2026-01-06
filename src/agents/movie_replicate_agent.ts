import { readFileSync } from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import Replicate from "replicate";
import {
  apiKeyMissingError,
  agentGenerationError,
  agentInvalidResponseError,
  imageAction,
  movieFileTarget,
  videoDurationTarget,
  unsupportedModelTarget,
} from "../utils/error_cause.js";

import type { AgentBufferResult, MovieAgentInputs, ReplicateMovieAgentParams, ReplicateMovieAgentConfig } from "../types/agent.js";
import { provider2MovieAgent, getModelDuration } from "../types/provider2agent.js";

async function generateMovie(
  model: `${string}/${string}`,
  apiKey: string,
  prompt: string,
  imagePath: string | undefined,
  aspectRatio: string,
  duration: number,
): Promise<Buffer | undefined> {
  const replicate = new Replicate({
    auth: apiKey,
  });

  const input = {
    prompt,
    duration,
    image: undefined as string | undefined,
    start_image: undefined as string | undefined,
    first_frame_image: undefined as string | undefined,
    aspect_ratio: aspectRatio, // only for bytedance/seedance-1-lite
    // resolution: "720p", // only for bytedance/seedance-1-lite
    // fps: 24, // only for bytedance/seedance-1-lite
    // camera_fixed: false, // only for bytedance/seedance-1-lite
    // mode: "standard" // only for kwaivgi/kling-v2.1
    // negative_prompt: "" // only for kwaivgi/kling-v2.1
  };

  // Add image if provided (for image-to-video generation)
  if (imagePath) {
    const buffer = readFileSync(imagePath);
    const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;
    const start_image = provider2MovieAgent.replicate.modelParams[model]?.start_image;
    if (start_image === "first_frame_image" || start_image === "image" || start_image === "start_image") {
      input[start_image] = base64Image;
    } else if (start_image === undefined) {
      throw new Error(`Model ${model} does not support image-to-video generation`, {
        cause: agentGenerationError("movieReplicateAgent", imageAction, unsupportedModelTarget),
      });
    } else {
      input.image = base64Image;
    }
  }

  try {
    const output = await replicate.run(model, { input });

    // Download the generated video
    if (output && typeof output === "object" && "url" in output) {
      const videoUrl = (output.url as () => URL)();
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new Error(`Error downloading video: ${videoResponse.status} - ${videoResponse.statusText}`, {
          cause: agentGenerationError("movieReplicateAgent", imageAction, movieFileTarget),
        });
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return undefined;
  } catch (error) {
    GraphAILogger.info("Replicate generation error:", error);
    throw error;
  }
}

export const getAspectRatio = (canvasSize: { width: number; height: number }): string => {
  const ratio = canvasSize.width / canvasSize.height;
  const tolerance = 0.1;
  if (ratio > 4 / 3 + tolerance) return "16:9";
  if (ratio > 4 / 3 - tolerance) return "4:3";
  if (ratio > 3 / 4 + tolerance) return "1:1";
  if (ratio > 3 / 4 - tolerance) return "3:4";
  return "9:16";
};

export const movieReplicateAgent: AgentFunction<ReplicateMovieAgentParams, AgentBufferResult, MovieAgentInputs, ReplicateMovieAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, imagePath } = namedInputs;
  const aspectRatio = getAspectRatio(params.canvasSize);
  const model = params.model ?? provider2MovieAgent.replicate.defaultModel;
  if (!provider2MovieAgent.replicate.modelParams[model]) {
    throw new Error(`Model ${model} is not supported`, {
      cause: agentGenerationError("movieReplicateAgent", imageAction, unsupportedModelTarget),
    });
  }
  const duration = getModelDuration("replicate", model, params.duration);

  if (duration === undefined || !provider2MovieAgent.replicate.modelParams[model].durations.includes(duration)) {
    throw new Error(
      `Duration ${duration} is not supported for model ${model}. Supported durations: ${provider2MovieAgent.replicate.modelParams[model].durations.join(", ")}`,
      {
        cause: agentGenerationError("movieReplicateAgent", imageAction, videoDurationTarget),
      },
    );
  }

  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)", {
      cause: apiKeyMissingError("movieReplicateAgent", imageAction, "REPLICATE_API_TOKEN"),
    });
  }

  try {
    const buffer = await generateMovie(model, apiKey, prompt, imagePath, aspectRatio, duration);
    if (buffer) {
      return { buffer };
    }
  } catch (error) {
    GraphAILogger.info("Failed to generate movie:", (error as Error).message);
  }
  throw new Error("ERROR: generateMovie returned undefined", {
    cause: agentInvalidResponseError("movieReplicateAgent", imageAction, movieFileTarget),
  });
};

const movieReplicateAgentInfo: AgentFunctionInfo = {
  name: "movieReplicateAgent",
  agent: movieReplicateAgent,
  mock: movieReplicateAgent,
  samples: [],
  description: "Replicate Movie agent using seedance-1-lite",
  category: ["movie"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["REPLICATE_API_TOKEN"],
};

export default movieReplicateAgentInfo;
