import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { MulmoStudio, MulmoStudioContext, MulmoStudioBeat } from "../types/index.js";
import { silentPath, silentLastPath } from "../utils/file.js";
import { FfmpegContextInit, FfmpegContextGenerateOutput, FfmpegContextAddFormattedAudio, ffmPegGetMediaDuration } from "../utils/ffmpeg_utils.js";

const combineAudioFilesAgent: AgentFunction<null, { studio: MulmoStudio }, { context: MulmoStudioContext; combinedFileName: string }> = async ({
  namedInputs,
}) => {
  const { context, combinedFileName } = namedInputs;
  const ffmpegContext = FfmpegContextInit();

  const inputIds = (
    await Promise.all(
      context.studio.beats.map(async (studioBeat: MulmoStudioBeat, index: number) => {
        const isLastGap = index === context.studio.beats.length - 2;
        if (studioBeat.audioFile) {
          const audioId = FfmpegContextAddFormattedAudio(ffmpegContext, studioBeat.audioFile);
          const silentId = FfmpegContextAddFormattedAudio(ffmpegContext, isLastGap ? silentLastPath : silentPath);
          // TODO: Remove hard-coded 0.8 and 0.3
          studioBeat.duration = (await ffmPegGetMediaDuration(studioBeat.audioFile)) + (isLastGap ? 0.8 : 0.3);
          return [audioId, silentId];
        } else {
          GraphAILogger.error("Missing studioBeat.audioFile:", index);
          return [];
        }
      }),
    )
  ).flat();
  ffmpegContext.filterComplex.push(`${inputIds.join("")}concat=n=${inputIds.length}:v=0:a=1[aout]`);

  await FfmpegContextGenerateOutput(ffmpegContext, combinedFileName, ["-map", "[aout]"]);

  return {
    studio: context.studio,
  };
};

const combineAudioFilesAgentInfo: AgentFunctionInfo = {
  name: "combineAudioFilesAgent",
  agent: combineAudioFilesAgent,
  mock: combineAudioFilesAgent,
  samples: [],
  description: "combineAudioFilesAgent",
  category: ["ffmpeg"],
  author: "satoshi nakajima",
  repository: "https://github.com/snakajima/ai-podcaster",
  license: "MIT",
};

export default combineAudioFilesAgentInfo;
