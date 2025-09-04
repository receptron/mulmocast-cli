import fs from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { getAspectRatio } from "./movie_google_agent.js";
import { provider2ImageAgent } from "../utils/provider2agent.js";
import type { AgentBufferResult, ImageAgentInputs, ImageAgentParams, GenAIImageAgentConfig } from "../types/agent.js";
import { GoogleGenAI, PersonGeneration } from "@google/genai";
import { blankImagePath, blankSquareImagePath, blankVerticalImagePath } from "../utils/file.js";

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
    throw new Error("Google GenAI API key is required (GEMINI_API_KEY)");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    if (model === "gemini-2.5-flash-image-preview") {
      const contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
      const images = [...(referenceImages ?? [])];
      // NOTE: There is no way to explicitly specify the aspect ratio for Gemini. This is just a hint.
      if (aspectRatio === "9:16") {
        images.push(blankVerticalImagePath());
      } else if (aspectRatio === "1:1") {
        images.push(blankSquareImagePath());
      } else {
        images.push(blankImagePath());
      }
      images.forEach((imagePath) => {
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString("base64");
        contents.push({ inlineData: { mimeType: "image/png", data: base64Image } });
      });
      const response = await ai.models.generateContent({ model, contents });
      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("ERROR: generateContent returned no candidates");
      }
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          GraphAILogger.info("Gemini image generation response:", part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          if (!imageData) {
            throw new Error("ERROR: generateContent returned no image data");
          }
          const buffer = Buffer.from(imageData, "base64");
          return { buffer };
        }
      }
      throw new Error("ERROR: generateContent returned no image data");
    } else {
      const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1, // default is 4!
          aspectRatio,
          personGeneration: PersonGeneration.ALLOW_ALL,
          // safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
        },
      });
      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("ERROR: generateImage returned no generated images");
      }
      const image = response.generatedImages[0].image;
      if (image && image.imageBytes) {
        return { buffer: Buffer.from(image.imageBytes, "base64") };
      }
      throw new Error("ERROR: generateImage returned no image bytes");
    }
  } catch (error) {
    GraphAILogger.info("Failed to generate image:", error);
    throw error;
  }
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
  // source: "https://github.com/receptron/mulmocast-cli/blob/main/src/agents/image_google_agent.ts",
  license: "MIT",
  environmentVariables: [],
};

export default imageGenAIAgentInfo;
