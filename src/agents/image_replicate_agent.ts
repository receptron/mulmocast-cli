import { AgentFunction, AgentFunctionInfo, GraphAILogger } from "graphai";
import Replicate from "replicate";
import { getAspectRatio } from "./movie_replicate_agent.js";
import type { ReplicateImageAgentParams } from "../types/agent.js";

import type { AgentBufferResult, ImageAgentInputs, AgentConfig } from "../types/agent.js";
import { provider2ImageAgent } from "../utils/provider2agent.js";

export type ReplicateImageAgentConfig = AgentConfig;

export const imageReplicateAgent: AgentFunction<ReplicateImageAgentParams, AgentBufferResult, ImageAgentInputs, ReplicateImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt } = namedInputs;
  const { canvasSize } = params;
  const model = params.model ?? (provider2ImageAgent.replicate.defaultModel as `${string}/${string}`);
  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)");
  }
  const replicate = new Replicate({
    auth: apiKey,
  });

  const input = {
    prompt,
    width: canvasSize.width,
    height: canvasSize.height,
  } as { prompt: string; width?: number; height?: number; size?: string; aspect_ratio?: string };

  input.aspect_ratio = getAspectRatio(canvasSize);
  if (model === "bytedance/seedream-4") {
    delete input.width;
    delete input.height;
  }

  // Add image if provided (for image-to-image generation)
  /*
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
  */

  try {
    const output = await replicate.run(model, { input });

    // Download the generated video
    if (output && Array.isArray(output) && output.length > 0 && typeof output[0] === "object" && "url" in output[0]) {
      const imageUrl = (output[0].url as () => URL)();
      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        throw new Error(`Error downloading video: ${imageResponse.status} - ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { buffer };
    }
    throw new Error("ERROR: generateImage returned undefined");
  } catch (error) {
    GraphAILogger.info("Replicate generation error:", error);
    throw error;
  }
};

const imageReplicateAgentInfo: AgentFunctionInfo = {
  name: "imageReplicateAgent",
  agent: imageReplicateAgent,
  mock: imageReplicateAgent,
  samples: [],
  description: "Replicate Image agent using FLUX and other models",
  category: ["image"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["REPLICATE_API_TOKEN"],
};

export default imageReplicateAgentInfo;
