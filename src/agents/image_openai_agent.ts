import fs from "fs";
import path from "path";
import { AgentFunction, AgentFunctionInfo, GraphAILogger } from "graphai";
import OpenAI, { toFile, AuthenticationError, RateLimitError, APIError } from "openai";
import { provider2ImageAgent, gptImages } from "../utils/provider2agent.js";
import {
  apiKeyMissingError,
  agentGenerationError,
  openAIAgentGenerationError,
  agentIncorrectAPIKeyError,
  agentAPIRateLimitError,
  agentInvalidResponseError,
  imageAction,
  imageFileTarget,
} from "../utils/error_cause.js";
import type { AgentBufferResult, OpenAIImageOptions, OpenAIImageAgentParams, OpenAIImageAgentInputs, OpenAIImageAgentConfig } from "../types/agent.js";

// https://platform.openai.com/docs/guides/image-generation
export const imageOpenaiAgent: AgentFunction<OpenAIImageAgentParams, AgentBufferResult, OpenAIImageAgentInputs, OpenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, referenceImages } = namedInputs;
  const { moderation, canvasSize, quality } = params;
  const { apiKey, baseURL } = { ...config };
  if (!apiKey) {
    throw new Error("OpenAI API key is required (OPENAI_API_KEY)", {
      cause: apiKeyMissingError("imageOpenaiAgent", imageAction, "OPENAI_API_KEY"),
    });
  }
  const model = params.model ?? provider2ImageAgent["openai"].defaultModel;
  const openai = new OpenAI({ apiKey, baseURL });
  const size = (() => {
    if (gptImages.includes(model)) {
      if (canvasSize.width > canvasSize.height) {
        return "1536x1024";
      } else if (canvasSize.width < canvasSize.height) {
        return "1024x1536";
      } else {
        return "1024x1024";
      }
    } else {
      if (canvasSize.width > canvasSize.height) {
        return "1792x1024";
      } else if (canvasSize.width < canvasSize.height) {
        return "1024x1792";
      } else {
        return "1024x1024";
      }
    }
  })();

  const imageOptions: OpenAIImageOptions = {
    model,
    prompt,
    n: 1,
    size,
  };
  if (gptImages.includes(model)) {
    imageOptions.moderation = moderation || "auto";
    imageOptions.background = "opaque";
    if (quality) {
      imageOptions.quality = quality;
    }
  }

  const response = await (async () => {
    try {
      const targetSize = imageOptions.size;
      if ((referenceImages ?? []).length > 0 && (targetSize === "1536x1024" || targetSize === "1024x1536" || targetSize === "1024x1024")) {
        const referenceImageFiles = await Promise.all(
          (referenceImages ?? []).map(async (file) => {
            const ext = path.extname(file).toLowerCase();
            const type = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
            return await toFile(fs.createReadStream(file), null, { type });
          }),
        );
        return await openai.images.edit({ ...imageOptions, size: targetSize, image: referenceImageFiles });
      } else {
        return await openai.images.generate(imageOptions);
      }
    } catch (error) {
      GraphAILogger.info("Failed to generate image:", (error as Error).message);
      if (error instanceof AuthenticationError) {
        throw new Error("Failed to generate image: 401 Incorrect API key provided with OpenAI", {
          cause: agentIncorrectAPIKeyError("imageOpenaiAgent", imageAction, imageFileTarget),
        });
      }
      if (error instanceof RateLimitError) {
        throw new Error("You exceeded your current quota", {
          cause: agentAPIRateLimitError("imageOpenaiAgent", imageAction, imageFileTarget),
        });
      }
      if (error instanceof APIError) {
        if (error.code && error.type) {
          throw new Error("Failed to generate image with OpenAI", {
            cause: openAIAgentGenerationError("imageOpenaiAgent", imageAction, error.code, error.type),
          });
        }
        if (error.type === "invalid_request_error" && error?.error?.message?.includes("Your organization must be verified")) {
          throw new Error("Failed to generate image with OpenAI", {
            cause: openAIAgentGenerationError("imageOpenaiAgent", imageAction, "need_verified_organization", error.type),
          });
        }
      }
      throw new Error("Failed to generate image with OpenAI", {
        cause: agentGenerationError("imageOpenaiAgent", imageAction, imageFileTarget),
      });
    }
  })();

  if (!response.data) {
    throw new Error(`response.data is undefined: ${response}`, {
      cause: agentInvalidResponseError("imageOpenaiAgent", imageAction, imageFileTarget),
    });
  }
  const url = response.data[0].url;
  if (!url) {
    // For gpt-image-1
    const image_base64 = response.data[0].b64_json;
    if (!image_base64) {
      throw new Error(`response.data[0].b64_json is undefined: ${response}`, {
        cause: agentInvalidResponseError("imageOpenaiAgent", imageAction, imageFileTarget),
      });
    }
    return { buffer: Buffer.from(image_base64, "base64") };
  }

  // For dall-e-3
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`, {
      cause: agentGenerationError("imageOpenaiAgent", imageAction, imageFileTarget),
    });
  }

  // 2. Read the response as an ArrayBuffer
  const arrayBuffer = await res.arrayBuffer();

  // 3. Convert the ArrayBuffer to a Node.js Buffer and return it along with url
  return { buffer: Buffer.from(arrayBuffer) };
};

const imageOpenaiAgentInfo: AgentFunctionInfo = {
  name: "imageOpenaiAgent",
  agent: imageOpenaiAgent,
  mock: imageOpenaiAgent,
  samples: [],
  description: "OpenAI Image agent",
  category: ["image"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  // source: "https://github.com/receptron/mulmocast-cli/blob/main/src/agents/image_openai_agent.ts",
  license: "MIT",
  environmentVariables: ["OPENAI_API_KEY"],
};

export default imageOpenaiAgentInfo;
