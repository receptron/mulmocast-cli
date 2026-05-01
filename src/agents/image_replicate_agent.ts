import { readFileSync } from "fs";
import { AgentFunction, AgentFunctionInfo, GraphAILogger } from "graphai";
import Replicate from "replicate";
import { getAspectRatio } from "./movie_replicate_agent.js";
import type { ReplicateImageAgentParams } from "../types/agent.js";
import {
  apiKeyMissingError,
  agentIncorrectAPIKeyError,
  agentGenerationError,
  agentInvalidResponseError,
  imageAction,
  imageFileTarget,
  hasCause,
} from "../utils/error_cause.js";

import type { AgentBufferResult, ImageAgentInputs, AgentConfig } from "../types/agent.js";
import { provider2ImageAgent } from "../types/provider2agent.js";

export type ReplicateImageAgentConfig = AgentConfig;

// Replicate image models return one of: FileOutput (object with url() method),
// Array<FileOutput>, string URL, or { url: string }. Normalize to URL string/URL.
const extractImageUrl = (output: unknown): string | URL | undefined => {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.length > 0 ? extractImageUrl(output[0]) : undefined;
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url: unknown }).url;
    if (typeof url === "function") return (url as () => URL)();
    if (typeof url === "string") return url;
  }
  return undefined;
};

export const imageReplicateAgent: AgentFunction<ReplicateImageAgentParams, AgentBufferResult, ImageAgentInputs, ReplicateImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, referenceImages } = namedInputs;
  const { canvasSize } = params;
  const model = params.model ?? (provider2ImageAgent.replicate.defaultModel as `${string}/${string}`);
  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)", {
      cause: apiKeyMissingError("imageReplicateAgent", imageAction, "REPLICATE_API_TOKEN"),
    });
  }
  const replicate = new Replicate({
    auth: apiKey,
  });

  const input = {
    prompt,
    aspect_ratio: getAspectRatio(canvasSize),
  } as { prompt: string; aspect_ratio: string; image_input?: string[] };

  if (referenceImages && referenceImages.length > 0) {
    input.image_input = referenceImages.map((image) => {
      const buffer = readFileSync(image);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    });
  }

  try {
    const output = await replicate.run(model, { input });

    const imageUrl = extractImageUrl(output);
    if (!imageUrl) {
      throw new Error("ERROR: generateImage returned undefined", {
        cause: agentInvalidResponseError("imageReplicateAgent", imageAction, imageFileTarget),
      });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Error downloading image: ${imageResponse.status} - ${imageResponse.statusText}`, {
        cause: agentGenerationError("imageReplicateAgent", imageAction, imageFileTarget),
      });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer };
  } catch (error) {
    GraphAILogger.info("Replicate generation error:", error);
    if (hasCause(error) && error.cause) {
      throw error;
    }
    if (typeof error === "object" && error !== null && "response" in error) {
      const errorWithResponse = error as { response?: { status?: number } };
      if (errorWithResponse.response?.status === 401) {
        throw new Error("Failed to generate image: 401 Incorrect API key provided with replicate", {
          cause: agentIncorrectAPIKeyError("imageGenAIAgent", imageAction, imageFileTarget),
        });
      }
    }
    throw new Error("Failed to generate image with Replicate", {
      cause: agentGenerationError("imageReplicateAgent", imageAction, imageFileTarget),
    });
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
