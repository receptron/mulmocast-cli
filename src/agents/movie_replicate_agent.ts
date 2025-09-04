import { readFileSync } from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import Replicate from "replicate";

import type { AgentBufferResult, MovieAgentInputs, ReplicateMovieAgentParams, ReplicateMovieAgentConfig } from "../types/agent.js";
import { provider2MovieAgent } from "../utils/provider2agent.js";

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
      throw new Error(`Model ${model} does not support image-to-video generation`);
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
        throw new Error(`Error downloading video: ${videoResponse.status} - ${videoResponse.statusText}`);
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
  if (canvasSize.width > canvasSize.height) {
    return "16:9";
  } else if (canvasSize.width < canvasSize.height) {
    return "9:16";
  } else {
    return "1:1";
  }
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
    throw new Error(`Model ${model} is not supported`);
  }
  const duration = (() => {
    const durations = provider2MovieAgent.replicate.modelParams[model].durations;
    if (params.duration) {
      const largerDurations = durations.filter((d) => d >= params.duration!);
      return largerDurations.length > 0 ? largerDurations[0] : durations[durations.length - 1];
    } else {
      return durations[0];
    }
  })();

  if (!provider2MovieAgent.replicate.modelParams[model].durations.includes(duration)) {
    throw new Error(
      `Duration ${duration} is not supported for model ${model}. Supported durations: ${provider2MovieAgent.replicate.modelParams[model].durations.join(", ")}`,
    );
  }

  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)");
  }

  try {
    const buffer = await generateMovie(model, apiKey, prompt, imagePath, aspectRatio, duration);
    if (buffer) {
      return { buffer };
    }
    throw new Error("ERROR: generateMovie returned undefined");
  } catch (error) {
    GraphAILogger.info("Failed to generate movie:", (error as Error).message);
    throw error;
  }
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
