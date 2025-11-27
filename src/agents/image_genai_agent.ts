import fs from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { provider2ImageAgent } from "../utils/provider2agent.js";
import {
  apiKeyMissingError,
  agentIncorrectAPIKeyError,
  agentGenerationError,
  agentInvalidResponseError,
  imageAction,
  imageFileTarget,
  hasCause,
  getGenAIErrorReason,
  resultify,
} from "../utils/error_cause.js";
import type { AgentBufferResult, ImageAgentInputs, ImageAgentParams, GenAIImageAgentConfig } from "../types/agent.js";
import { GoogleGenAI, PersonGeneration, GenerateContentResponse } from "@google/genai";
import { blankImagePath, blankSquareImagePath, blankVerticalImagePath } from "../utils/file.js";

const getAspectRatio = (canvasSize: { width: number; height: number }): string => {
  if (canvasSize.width > canvasSize.height) {
    return "16:9";
  } else if (canvasSize.width < canvasSize.height) {
    return "9:16";
  }
  return "1:1";
};
export const ratio2BlankPath = (aspectRatio: string) => {
  if (aspectRatio === "9:16") {
    return blankVerticalImagePath();
  } else if (aspectRatio === "1:1") {
    return blankSquareImagePath();
  }
  return blankImagePath();
};

const getGeminiContents = (prompt: string, referenceImages?: string[] | null, aspectRatio?: string) => {
  const contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
  const images = [...(referenceImages ?? [])];
  // NOTE: There is no way to explicitly specify the aspect ratio for Gemini. This is just a hint.
  if (aspectRatio) {
    images.push(ratio2BlankPath(aspectRatio));
  }
  images.forEach((imagePath) => {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");
    contents.push({ inlineData: { mimeType: "image/png", data: base64Image } });
  });
  return contents;
};

const geminiFlashResult = (response: GenerateContentResponse) => {
  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error("ERROR: generateContent returned no candidates", {
      cause: agentInvalidResponseError("imageGenAIAgent", imageAction, imageFileTarget),
    });
  }
  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      GraphAILogger.info("Gemini image generation response:", part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      if (!imageData) {
        throw new Error("ERROR: generateContent returned no image data", {
          cause: agentInvalidResponseError("imageGenAIAgent", imageAction, imageFileTarget),
        });
      }
      const buffer = Buffer.from(imageData, "base64");
      return { buffer };
    }
  }
  throw new Error("ERROR: generateContent returned no image data", {
    cause: agentInvalidResponseError("imageGenAIAgent", imageAction, imageFileTarget),
  });
};

const errorProcess = (error) => {
  GraphAILogger.info("Failed to generate image:", error);
  if (hasCause(error) && error.cause) {
    throw error;
  }
  const reasonDetail = getGenAIErrorReason(error);
  if (reasonDetail && reasonDetail.reason && reasonDetail.reason === "API_KEY_INVALID") {
    throw new Error("Failed to generate tts: 400 Incorrect API key provided with gemini", {
      cause: agentIncorrectAPIKeyError("imageGenAIAgent", imageAction, imageFileTarget),
    });
  }
  throw new Error("Failed to generate image with Google GenAI", {
    cause: agentGenerationError("imageGenAIAgent", imageAction, imageFileTarget),
  });
};

export const imageGenAIAgent: AgentFunction<ImageAgentParams, AgentBufferResult, ImageAgentInputs, GenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, referenceImages } = namedInputs;
  const aspectRatio = getAspectRatio(params.canvasSize);
  const model = params.model ?? provider2ImageAgent["google"].defaultModel;
  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Google GenAI API key is required (GEMINI_API_KEY)", {
      cause: apiKeyMissingError("imageGenAIAgent", imageAction, "GEMINI_API_KEY"),
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  if (model === "gemini-2.5-flash-image" || model === "gemini-3-pro-image-preview") {
    const contentParams = (() => {
      if (model === "gemini-2.5-flash-image") {
        const contents = getGeminiContents(prompt, referenceImages, aspectRatio);
        return { model, contents };
      }
      // gemini-3-pro-image-preview
      const contents = getGeminiContents(prompt, referenceImages);
      return {
        model,
        contents,
        config: {
          imageConfig: {
            // '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', or '21:9'.
            aspectRatio,
          },
        },
      };
    })();
    const res = await resultify(() => ai.models.generateContent(contentParams));
    if (res.ok) {
      return geminiFlashResult(res.value);
    }
    return errorProcess(res.error);
  }
  // other case,
  const generateParams = {
    model,
    prompt,
    config: {
      numberOfImages: 1, // default is 4!
      aspectRatio,
      personGeneration: PersonGeneration.ALLOW_ALL,
      // safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
    },
  };
  const res = await resultify(() => ai.models.generateImages(generateParams));
  if (!res.ok) {
    return errorProcess(res.error);
  }
  const response = res.value;
  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("ERROR: generateImage returned no generated images", {
      cause: agentInvalidResponseError("imageGenAIAgent", imageAction, imageFileTarget),
    });
  }
  const image = response.generatedImages[0].image;
  if (image && image.imageBytes) {
    return { buffer: Buffer.from(image.imageBytes, "base64") };
  }
  throw new Error("ERROR: generateImage returned no image bytes", {
    cause: agentInvalidResponseError("imageGenAIAgent", imageAction, imageFileTarget),
  });
};

const imageGenAIAgentInfo: AgentFunctionInfo = {
  name: "imageGenAIAgent",
  agent: imageGenAIAgent,
  mock: imageGenAIAgent,
  samples: [],
  description: "Google Image agent",
  category: ["image"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: [],
};

export default imageGenAIAgentInfo;
