import { readFileSync, existsSync } from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import Replicate from "replicate";
import { provider2LipSyncAgent } from "../utils/provider2agent.js";

import type { AgentBufferResult, LipSyncAgentInputs, ReplicateLipSyncAgentParams, ReplicateLipSyncAgentConfig } from "../types/agent.js";

export const lipSyncReplicateAgent: AgentFunction<ReplicateLipSyncAgentParams, AgentBufferResult, LipSyncAgentInputs, ReplicateLipSyncAgentConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { movieFile, audioFile, imageFile } = namedInputs;
  const apiKey = config?.apiKey;
  const model = params.model ?? provider2LipSyncAgent.replicate.defaultModel;

  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)");
  }
  const replicate = new Replicate({
    auth: apiKey,
  });

  if (!audioFile || !existsSync(audioFile)) {
    throw new Error(`lipSyncReplicateAgent audioFile not exist: ${audioFile}`);
  }

  const audioBuffer = readFileSync(audioFile);
  const videoBuffer = movieFile ? readFileSync(movieFile) : undefined;
  const imageBuffer = imageFile ? readFileSync(imageFile) : undefined;

  if (!videoBuffer && !imageBuffer) {
    throw new Error("lipSyncReplicateAgent Either movieFile or imageFile is required");
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
    throw new Error(`Model ${model} is not supported`);
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
    const output = await replicate.run(model_identifier, {
      input,
    });

    if (output && typeof output === "object" && "url" in output) {
      const videoUrl = (output.url as () => URL)();
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new Error(`Error downloading video: ${videoResponse.status} - ${videoResponse.statusText}`);
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer) };
    }
    return undefined;
  } catch (error) {
    GraphAILogger.info("Failed to generate lip sync:", (error as Error).message);
    throw error;
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
