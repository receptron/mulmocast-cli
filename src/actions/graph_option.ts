import { TaskManager } from "graphai";
import type { GraphOptions } from "graphai";
import { MulmoStudioContext } from "../types/index.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { fileCacheAgentFilter } from "../utils/filters.js";
import { settings2GraphAIConfig } from "../utils/utils.js";

export const graphOption = async (context: MulmoStudioContext, settings?: Record<string, string>) => {
  const options: GraphOptions = {
    agentFilters: [
      {
        name: "fileCacheAgentFilter",
        agent: fileCacheAgentFilter,
        nodeIds: ["imageGenerator", "movieGenerator", "htmlImageAgent", "soundEffectGenerator", "lipSyncGenerator", "AudioTrimmer"],
      },
    ],
    taskManager: new TaskManager(MulmoPresentationStyleMethods.getConcurrency(context.presentationStyle)),
    config: settings2GraphAIConfig(settings, process.env),
  };

  return options;
};
