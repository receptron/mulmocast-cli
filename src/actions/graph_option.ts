import { TaskManager } from "graphai";
import type { GraphOptions } from "graphai";
import { MulmoStudioContext } from "../types/index.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { fileCacheAgentFilter } from "../utils/filters.js";
import { settings2GraphAIConfig } from "../utils/utils.js";

const createGraphOption = (concurrency: number, cacheNodeIds: string[], settings?: Record<string, string>): GraphOptions => ({
  agentFilters: [
    {
      name: "fileCacheAgentFilter",
      agent: fileCacheAgentFilter,
      nodeIds: cacheNodeIds,
    },
  ],
  taskManager: new TaskManager(concurrency),
  config: settings2GraphAIConfig(settings, process.env),
});

const IMAGE_CACHE_NODE_IDS = ["imageGenerator", "movieGenerator", "htmlImageAgent", "soundEffectGenerator", "lipSyncGenerator", "AudioTrimmer"];
const AUDIO_CACHE_NODE_IDS = ["tts"];

export const imageGraphOption = async (context: MulmoStudioContext, settings?: Record<string, string>): Promise<GraphOptions> =>
  createGraphOption(MulmoPresentationStyleMethods.getImageConcurrency(context.presentationStyle), IMAGE_CACHE_NODE_IDS, settings);

export const audioGraphOption = async (context: MulmoStudioContext, settings?: Record<string, string>): Promise<GraphOptions> =>
  createGraphOption(MulmoPresentationStyleMethods.getAudioConcurrency(context.presentationStyle), AUDIO_CACHE_NODE_IDS, settings);
