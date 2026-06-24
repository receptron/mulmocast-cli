import { readFileSync, existsSync } from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import Replicate from "replicate";
import { provider2LipSyncAgent } from "../types/provider2agent.js";
import {
  apiKeyMissingError,
  agentGenerationError,
  agentFileNotExistError,
  imageAction,
  movieFileTarget,
  audioFileTarget,
  hasCause,
} from "../utils/error_cause.js";

import type { AgentBufferResult, LipSyncAgentInputs, ReplicateLipSyncAgentParams, ReplicateLipSyncAgentConfig } from "../types/agent.js";
import type { AgentUsage } from "../types/usage.js";
import { runReplicateWithMetrics } from "../utils/replicate_usage.js";

export const lipSyncReplicateAgent: AgentFunction<ReplicateLipSyncAgentParams, AgentBufferResult, LipSyncAgentInputs, ReplicateLipSyncAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { movieFile, audioFile, imageFile } = namedInputs;
  const apiKey = config?.apiKey;
  const model = params.model ?? provider2LipSyncAgent.replicate.defaultModel;

  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)", {
      cause: apiKeyMissingError("lipSyncReplicateAgent", imageAction, "REPLICATE_API_TOKEN"),
    });
  }
  const replicate = new Replicate({
    auth: apiKey,
  });

  if (!audioFile || !existsSync(audioFile)) {
    throw new Error(`lipSyncReplicateAgent audioFile not exist: ${audioFile}`, {
      cause: agentFileNotExistError("lipSyncReplicateAgent", imageAction, audioFileTarget, audioFile),
    });
  }

  const audioBuffer = readFileSync(audioFile);
  const videoBuffer = movieFile ? readFileSync(movieFile) : undefined;
  const imageBuffer = imageFile ? readFileSync(imageFile) : undefined;

  if (!videoBuffer && !imageBuffer) {
    throw new Error("lipSyncReplicateAgent Either movieFile or imageFile is required", {
      cause: agentGenerationError("lipSyncReplicateAgent", imageAction, movieFileTarget),
    });
  }

  const audioUri = `data:audio/wav;base64,${audioBuffer.toString("base64")}`;
  const videoUri = videoBuffer ? `data:video/quicktime;base64,${videoBuffer.toString("base64")}` : undefined;
  const imageUri = imageBuffer ? `data:image/png;base64,${imageBuffer.toString("base64")}` : undefined;

  const input = {
    video: undefined as string | undefined,
    video_input: undefined as string | undefined,
    video_url: undefined as string | undefined,
    audio: undefined as string | undefined,
    audio_input: undefined as string | undefined,
    audio_file: undefined as string | undefined,
    image: undefined as string | undefined,
  };

  const modelParams = provider2LipSyncAgent.replicate.modelParams[model];
  if (!modelParams) {
    throw new Error(`Model ${model} is not supported`, {
      cause: agentGenerationError("lipSyncReplicateAgent", imageAction, movieFileTarget),
    });
  }
  const videoParam = modelParams.video;
  const audioParam = modelParams.audio;
  const imageParam = modelParams.image;
  if (videoParam === "video" || videoParam === "video_input" || videoParam === "video_url") {
    input[videoParam] = videoUri;
  }
  if (audioParam === "audio" || audioParam === "audio_input" || audioParam === "audio_file") {
    input[audioParam] = audioUri;
  }
  if (imageParam === "image") {
    input[imageParam] = imageUri;
  }
  const model_identifier: `${string}/${string}:${string}` | `${string}/${string}` = provider2LipSyncAgent.replicate.modelParams[model]?.identifier ?? model;

  try {
    const { output, predictSec } = await runReplicateWithMetrics(replicate, model_identifier, input);

    if (output && typeof output === "object" && "url" in output) {
      const videoUrl = ((output as { url: unknown }).url as () => URL)();
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new Error(`Error downloading video: ${videoResponse.status} - ${videoResponse.statusText}`, {
          cause: agentGenerationError("lipSyncReplicateAgent", imageAction, movieFileTarget),
        });
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      const usage: AgentUsage | undefined = predictSec !== undefined ? { provider: "replicate", model, predictSec } : undefined;
      return { buffer: Buffer.from(arrayBuffer), usage };
    }
    return undefined;
  } catch (error) {
    GraphAILogger.info("Failed to generate lip sync:", (error as Error).message);
    if (hasCause(error) && error.cause) {
      throw error;
    }
    // Include the underlying message so the catch-all path doesn't
    // mask Replicate SDK / fetch / arrayBuffer failures behind a
    // generic label (same fix as tts_gemini #1452, whisper #1453,
    // image_replicate #1454).
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to lipSync with Replicate: ${detail}`, {
      cause: agentGenerationError("lipSyncReplicateAgent", imageAction, movieFileTarget),
    });
  }
};

const lipSyncReplicateAgentInfo: AgentFunctionInfo = {
  name: "lipSyncReplicateAgent",
  agent: lipSyncReplicateAgent,
  mock: lipSyncReplicateAgent,
  samples: [],
  description: "Replicate Lip Sync agent (video + audio to video)",
  category: ["movie"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["REPLICATE_API_TOKEN"],
};

export default lipSyncReplicateAgentInfo;
