import "dotenv/config";

import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import ttsNijivoiceAgent from "../agents/tts_nijivoice_agent";
import addBGMAgent from "../agents/add_bgm_agent";
import combineAudioFilesAgent from "../agents/combine_audio_files_agent";
import ttsOpenaiAgent from "../agents/tts_openai_agent";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

import { MulmoStudio, MulmoBeat, SpeakerDictonary, Text2speechParams, FileDirs } from "../types";
import { fileCacheAgentFilter } from "../utils/filters";
import { getOutputBGMFilePath, getOutputAudioFilePath, getOutputStudioFilePath, defaultBGMPath } from "../utils/file";

// const rion_takanashi_voice = "b9277ce3-ba1c-4f6f-9a65-c05ca102ded0"; // たかなし りおん
// const ben_carter_voice = "bc06c63f-fef6-43b6-92f7-67f919bd5dae"; // ベン・カーター

const graph_tts: GraphData = {
  nodes: {
    preprocessor: {
      agent: (namedInputs: { beat: MulmoBeat; speakers: SpeakerDictonary; speechParams: Text2speechParams }) => {
        const { beat, speakers, speechParams } = namedInputs;
        return {
          voiceId: speakers[beat.speaker].voiceId,
          speechParams: { ...speechParams, ...beat.speechParams },
        };
      },
      inputs: {
        beat: ":beat",
        speechParams: ":script.speechParams",
        speakers: ":script.speechParams.speakers",
      },
    },
    ttsAgent: {
      agent: (namedInputs: { provider: string }) => {
        if (namedInputs.provider === "nijivoice") {
          return "ttsNijivoiceAgent";
        }
        return "ttsOpenaiAgent";
      },
      inputs: {
        provider: ":script.speechParams.provider",
      },
    },
    tts: {
      agent: ":ttsAgent",
      inputs: {
        text: ":beat.text",
        file: "${:scratchpadDirPath}/${:beat.filename}.mp3", // TODO
      },
      params: {
        throwError: true,
        voice: ":preprocessor.voiceId",
        speed: ":preprocessor.speechParams.speed",
        instructions: ":preprocessor.speechParams.instructions",
      },
    },
  },
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 8,
  nodes: {
    studio: {},
    outputBGMFilePath: {},
    outputAudioFilePath: {},
    outputStudioFilePath: {},
    scratchpadDirPath: {},
    bgmFilePath: {},
    map: {
      agent: "mapAgent",
      inputs: { rows: ":studio.beats", script: ":studio.script", scratchpadDirPath: ":scratchpadDirPath", bgmFilePath: ":bgmFilePath" },
      params: {
        rowKey: "beat",
        throwError: true,
      },
      graph: graph_tts,
    },
    combineFiles: {
      agent: "combineAudioFilesAgent",
      inputs: {
        map: ":map",
        studio: ":studio",
        combinedFileName: ":outputAudioFilePath",
        scratchpadDirPath: ":scratchpadDirPath",
      },
      isResult: true,
    },
    fileWrite: {
      agent: "fileWriteAgent",
      inputs: {
        file: ":outputStudioFilePath",
        text: ":combineFiles.studio.toJSON()",
      },
    },
    addBGM: {
      agent: "addBGMAgent",
      params: {
        // PATH_BGM is for debugging. No need to document it.
        musicFile: ":bgmFilePath",
      },
      console: {
        before: true,
      },
      inputs: {
        wait: ":combineFiles",
        voiceFile: ":outputAudioFilePath",
        outputFile: ":outputBGMFilePath",
        script: ":studio.script",
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
        title: "\n${:studio.script.title}\n\n${:studio.script.description}\nReference: ${:studio.script.reference}\n",
        waitFor: ":addBGM",
      },
    },
  },
};

const agentFilters = [
  {
    name: "fileCacheAgentFilter",
    agent: fileCacheAgentFilter,
    nodeIds: ["tts"],
  },
];

export const audio = async (studio: MulmoStudio, files: FileDirs, concurrency: number) => {
  const { outDirPath, scratchpadDirPath } = files;
  const outputBGMFilePath = getOutputBGMFilePath(outDirPath, studio.filename);
  const outputAudioFilePath = getOutputAudioFilePath(outDirPath, studio.filename);
  const outputStudioFilePath = getOutputStudioFilePath(outDirPath, studio.filename);

  graph_data.concurrency = concurrency;
  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
      fileWriteAgent,
      ttsOpenaiAgent,
      ttsNijivoiceAgent,
      addBGMAgent,
      combineAudioFilesAgent,
    },
    { agentFilters },
  );
  graph.injectValue("studio", studio);
  graph.injectValue("outputBGMFilePath", outputBGMFilePath);
  graph.injectValue("outputAudioFilePath", outputAudioFilePath);
  graph.injectValue("outputStudioFilePath", outputStudioFilePath);
  graph.injectValue("scratchpadDirPath", scratchpadDirPath);

  // BUGBUG: Either absolute path or relative to the Mulmo script file.
  const bgmPath = studio.script.audioParams?.bgm;
  graph.injectValue("bgmFilePath", bgmPath ?? process.env.PATH_BGM ?? defaultBGMPath);

  const results = await graph.run();

  const result = results.combineFiles as { fileName: string };
  console.log(`Generated: ${result.fileName}`);
};
