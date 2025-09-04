import fs from "fs";
import path from "path";
import { AgentFunction, AgentFunctionInfo, GraphAILogger } from "graphai";
import OpenAI, { toFile } from "openai";
import { provider2ImageAgent } from "../utils/provider2agent.js";
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
    throw new Error("OpenAI API key is required (OPENAI_API_KEY)");
  }
  const model = params.model ?? provider2ImageAgent["openai"].defaultModel;
  const openai = new OpenAI({ apiKey, baseURL });
  const size = (() => {
    if (model === "gpt-image-1") {
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
  if (model === "gpt-image-1") {
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
      throw error;
    }
  })();

  if (!response.data) {
    throw new Error(`response.data is undefined: ${response}`);
  }
  const url = response.data[0].url;
  if (!url) {
    // For gpt-image-1
    const image_base64 = response.data[0].b64_json;
    if (!image_base64) {
      throw new Error(`response.data[0].b64_json is undefined: ${response}`);
    }
    return { buffer: Buffer.from(image_base64, "base64") };
  }

  // For dall-e-3
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
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
