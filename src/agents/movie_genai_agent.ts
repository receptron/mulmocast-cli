import { readFileSync } from "fs";
import { GraphAILogger, sleep } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";

import type { AgentBufferResult, GenAIImageAgentConfig, GoogleMovieAgentParams, MovieAgentInputs } from "../types/agent.js";
import { GoogleGenAI, PersonGeneration } from "@google/genai";

export const getAspectRatio = (canvasSize: { width: number; height: number }): string => {
  if (canvasSize.width > canvasSize.height) {
    return "16:9";
  } else if (canvasSize.width < canvasSize.height) {
    return "9:16";
  } else {
    return "1:1";
  }
};

export const movieGenAIAgent: AgentFunction<GoogleMovieAgentParams, AgentBufferResult, MovieAgentInputs, GenAIImageAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt, imagePath, movieFile } = namedInputs;
  const aspectRatio = getAspectRatio(params.canvasSize);
  const model = params.model ?? "veo-2.0-generate-001"; // "veo-3.0-generate-preview";
  const duration = params.duration ?? 8;
  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Google GenAI API key is required (GEMINI_API_KEY)");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const payload = {
      model,
      prompt,
      config: {
        durationSeconds: duration,
        aspectRatio,
        personGeneration: undefined as PersonGeneration | undefined,
      },
      image: undefined as { imageBytes: string; mimeType: string } | undefined,
    };
    if (imagePath) {
      const buffer = readFileSync(imagePath);
      const imageBytes = buffer.toString("base64");

      payload.image = {
        imageBytes,
        mimeType: "image/png",
      };
    } else {
      payload.config.personGeneration = PersonGeneration.ALLOW_ALL;
    }
    const operation = await ai.models.generateVideos(payload);

    const response = { operation };
    // Poll the operation status until the video is ready.
    while (!response.operation.done) {
      await sleep(5000);
      response.operation = await ai.operations.getVideosOperation(response);
    }
    if (!response.operation.response?.generatedVideos) {
      throw new Error(`No video: ${JSON.stringify(response.operation, null, 2)}`);
    }
    const video = response.operation.response.generatedVideos[0].video;
    if (!video) {
      throw new Error(`No video: ${JSON.stringify(response.operation, null, 2)}`);
    }
    await ai.files.download({
      file: video,
      downloadPath: movieFile,
    });
    await sleep(5000); // HACK: Without this, the file is not ready yet.
    return { saved: movieFile };
  } catch (error) {
    GraphAILogger.info("Failed to generate movie:", (error as Error).message);
    throw error;
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
  // source: "https://github.com/receptron/mulmocast-cli/blob/main/src/agents/image_google_agent.ts",
  license: "MIT",
  environmentVariables: [],
};

export default movieGenAIAgentInfo;
