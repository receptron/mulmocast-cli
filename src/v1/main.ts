import "dotenv/config";
import fsPromise from "fs/promises";
import fs from "fs";
import { GraphAI, AgentFilterFunction, GraphData } from "graphai";
import * as agents from "@graphai/agents";
// import { ttsNijivoiceAgent } from "@graphai/tts_nijivoice_agent";
import ttsNijivoiceAgent from "./agents/tts_nijivoice_agent";
import addBGMAgent from "./agents/add_bgm_agent";
import combineFilesAgent from "./agents/combine_files_agent";
// import { ttsOpenaiAgent } from "@graphai/tts_openai_agent";
import ttsOpenaiAgent from "./agents/tts_openai_agent";
import { pathUtilsAgent, fileWriteAgent } from "@graphai/vanilla_node_agents";

import { ScriptData, VoiceMap } from "./type";
import { readPodcastScriptFile, getOutputFilePath, getScratchpadFilePath } from "./utils";

const rion_takanashi_voice = "b9277ce3-ba1c-4f6f-9a65-c05ca102ded0"; // たかなし りおん
const ben_carter_voice = "bc06c63f-fef6-43b6-92f7-67f919bd5dae"; // ベン・カーター

const graph_tts: GraphData = {
  nodes: {
    path: {
      agent: "pathUtilsAgent",
      params: {
        method: "resolve",
      },
      inputs: {
        dirs: ["scratchpad", "${:row.filename}.mp3"],
      },
    },
    voice: {
      agent: (namedInputs: { speaker: string; voicemap: VoiceMap; voice0: string }) => {
        const { speaker, voicemap, voice0 } = namedInputs;
        return voicemap[speaker] ?? voice0;
      },
      inputs: {
        speaker: ":row.speaker",
        voicemap: ":script.voicemap",
        voice0: ":script.voices.$0",
      },
    },
    tts: {
      agent: ":script.ttsAgent",
      inputs: {
        text: ":row.ttsText",
        file: ":path.path",
      },
      params: {
        throwError: true,
        voice: ":voice",
        speed: ":row.speed",
        speed_global: ":script.speed",
        instructions: ":row.instructions",
      },
    },
  },
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 8,
  nodes: {
    script: {
      value: {},
    },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":script.script", script: ":script" },
      graph: graph_tts,
    },
    combineFiles: {
      agent: "combineFilesAgent",
      inputs: {
        map: ":map",
        script: ":script",
        combinedFileName: "./output/${:script.filename}.mp3",
      },
      isResult: true,
    },
    fileWrite: {
      agent: "fileWriteAgent",
      inputs: {
        file: "./output/${:script.filename}.json",
        text: ":combineFiles.script.toJSON()",
      },
      params: { baseDir: __dirname + "/../" },
    },
    addBGM: {
      agent: "addBGMAgent",
      params: {
        musicFileName: process.env.PATH_BGM ?? "./music/StarsBeyondEx.mp3",
      },
      inputs: {
        voiceFile: ":combineFiles.fileName",
        outFileName: "./output/${:script.filename}_bgm.mp3",
        script: ":script",
      },
      isResult: true,
    },
    title: {
      agent: "copyAgent",
      params: {
        namedKey: "title",
      },
      console: {
        after: true,
      },
      inputs: {
        title: "\n${:script.title}\n\n${:script.description}\nReference: ${:script.reference}\n",
        waitFor: ":addBGM",
      },
    },
  },
};

const fileCacheAgentFilter: AgentFilterFunction = async (context, next) => {
  const { namedInputs } = context;
  const { file } = namedInputs;
  try {
    await fsPromise.access(file);
    const elements = file.split("/");
    console.log("cache hit: " + elements[elements.length - 1], namedInputs.text.slice(0, 10));
    return true;
  } catch (__e) {
    const output = (await next(context)) as { buffer: Buffer };
    const buffer = output ? output["buffer"] : undefined;
    if (buffer) {
      console.log("writing: " + file);
      await fsPromise.writeFile(file, buffer);
      return true;
    }
    console.log("no cache, no buffer: " + file);
    return false;
  }
};

const agentFilters = [
  {
    name: "fileCacheAgentFilter",
    agent: fileCacheAgentFilter,
    nodeIds: ["tts"],
  },
];

const main = async () => {
  const arg2 = process.argv[2];
  const readData = readPodcastScriptFile(arg2, "ERROR: File does not exist " + arg2)!;
  const { podcastData, fileName } = readData;

  podcastData.filename = fileName;
  podcastData.script.forEach((scriptData: ScriptData, index: number) => {
    scriptData.filename = podcastData.filename + index;
    // HACK: In case, the operator skip the "Split" phase.
    if (!scriptData.ttsText) {
      scriptData.ttsText = scriptData.text;
    }
  });

  // Check if any script changes
  const outputFilePath = getOutputFilePath(podcastData.filename + ".json");
  const { podcastData: prevScript } = readPodcastScriptFile(outputFilePath) ?? {};
  if (prevScript) {
    console.log("found output script", prevScript.filename);
    podcastData.script.forEach((scriptData: ScriptData, index: number) => {
      const prevText = prevScript.script[index]?.text ?? "";
      if (scriptData.text !== prevText) {
        const scratchpadFilePath = getScratchpadFilePath(scriptData.filename + ".mp3");
        if (fs.existsSync(scratchpadFilePath)) {
          console.log("deleting", scriptData.filename);
          fs.unlinkSync(scratchpadFilePath);
        }
      }
    });
  }

  if (podcastData.tts === "nijivoice") {
    graph_data.concurrency = 1;
    podcastData.voices = podcastData.voices ?? [rion_takanashi_voice, ben_carter_voice];
    podcastData.ttsAgent = "ttsNijivoiceAgent";
  } else {
    graph_data.concurrency = 8;
    podcastData.voices = podcastData.voices ?? ["shimmer", "echo"];
    podcastData.ttsAgent = "ttsOpenaiAgent";
  }
  const speakers = podcastData.speakers ?? ["Host", "Guest"];
  podcastData.voicemap = speakers.reduce((map: VoiceMap, speaker: string, index: number) => {
    map[speaker] = podcastData.voices![index];
    return map;
  }, {});
  /*
  script.imageInfo = script.script.map((_: ScriptData, index: number) => {
    return {
      index: index,
    };
  });
  */

  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
      pathUtilsAgent,
      fileWriteAgent,
      ttsOpenaiAgent,
      ttsNijivoiceAgent,
      addBGMAgent,
      combineFilesAgent,
    },
    { agentFilters },
  );
  graph.injectValue("script", podcastData);
  const results = await graph.run();
  const result = results.combineFiles as { fileName: string };
  console.log(`Generated: ${result.fileName}`);
};

main();
