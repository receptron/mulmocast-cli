import { readFileSync } from "fs";
import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import Replicate from "replicate";
import { provider2SoundEffectAgent } from "../utils/provider2agent.js";

import type { AgentBufferResult, SoundEffectAgentInputs, ReplicateSoundEffectAgentParams, ReplicateSoundEffectAgentConfig } from "../types/agent.js";

export const soundEffectReplicateAgent: AgentFunction<
  ReplicateSoundEffectAgentParams,
  AgentBufferResult,
  SoundEffectAgentInputs,
  ReplicateSoundEffectAgentConfig
> = async ({ namedInputs, params, config }) => {
  const { prompt, movieFile } = namedInputs;
  const apiKey = config?.apiKey;
  const model = params.model ?? provider2SoundEffectAgent.replicate.defaultModel;

  if (!apiKey) {
    throw new Error("Replicate API key is required (REPLICATE_API_TOKEN)");
  }
  const replicate = new Replicate({
    auth: apiKey,
  });

  const buffer = readFileSync(movieFile);
  const uri = `data:video/quicktime;base64,${buffer.toString("base64")}`;

  const input = {
    video: uri,
    prompt,
    duration: params.duration,
    // seed: -1,
    // num_steps: 25,
    // cfg_strength: 4.5,
    // negative_prompt: "music"
  };

  try {
    const model_identifier: `${string}/${string}:${string}` | `${string}/${string}` =
      provider2SoundEffectAgent.replicate.modelParams[model]?.identifier ?? model;
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
    GraphAILogger.info("Failed to generate sound effect:", (error as Error).message);
    throw error;
  }
};

const soundEffectReplicateAgentInfo: AgentFunctionInfo = {
  name: "soundEffectReplicateAgent",
  agent: soundEffectReplicateAgent,
  mock: soundEffectReplicateAgent,
  samples: [],
  description: "Replicate Sound Effect agent (movie to movie)",
  category: ["movie"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  license: "MIT",
  environmentVariables: ["REPLICATE_API_TOKEN"],
};

export default soundEffectReplicateAgentInfo;
