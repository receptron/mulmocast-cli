import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { MulmoStudioContext } from "../types/index.js";
import { FfmpegContextAddInput, FfmpegContextInit, FfmpegContextGenerateOutput, ffmpegGetMediaDuration } from "../utils/ffmpeg_utils.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { isFile } from "../utils/file.js";
import { agentGenerationError, agentFileNotExistError, audioAction, audioFileTarget } from "../utils/error_cause.js";

const addBGMAgent: AgentFunction<{ musicFile: string }, string, { voiceFile: string; outputFile: string; context: MulmoStudioContext }> = async ({
  namedInputs,
  params,
}) => {
  const { voiceFile, outputFile, context } = namedInputs;
  const { musicFile } = params;

  if (!isFile(voiceFile)) {
    throw new Error(`AddBGMAgent voiceFile not exist: ${voiceFile}`, {
      cause: agentFileNotExistError("addBGMAgent", audioAction, audioFileTarget, voiceFile),
    });
  }
  if (!musicFile.match(/^http/) && !isFile(musicFile)) {
    throw new Error(`AddBGMAgent musicFile not exist: ${musicFile}`, {
      cause: agentFileNotExistError("addBGMAgent", audioAction, audioFileTarget, musicFile),
    });
  }

  const { duration: speechDuration } = await ffmpegGetMediaDuration(voiceFile);
  const introPadding = MulmoStudioContextMethods.getIntroPadding(context);
  const outroPadding = context.presentationStyle.audioParams.outroPadding;
  const totalDuration = speechDuration + introPadding + outroPadding;
  GraphAILogger.log("totalDucation:", speechDuration, totalDuration);

  const ffmpegContext = FfmpegContextInit();
  const musicInputIndex = FfmpegContextAddInput(ffmpegContext, musicFile, ["-stream_loop", "-1"]);
  const voiceInputIndex = FfmpegContextAddInput(ffmpegContext, voiceFile);
  ffmpegContext.filterComplex.push(
    `[${musicInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, volume=${context.presentationStyle.audioParams.bgmVolume}[music]`,
  );
  ffmpegContext.filterComplex.push(
    `[${voiceInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, volume=${context.presentationStyle.audioParams.audioVolume}, adelay=${introPadding * 1000}|${introPadding * 1000}[voice]`,
  );
  ffmpegContext.filterComplex.push(`[music][voice]amix=inputs=2:duration=longest[mixed]`);
  ffmpegContext.filterComplex.push(`[mixed]atrim=start=0:end=${totalDuration}[trimmed]`);
  ffmpegContext.filterComplex.push(`[trimmed]afade=t=out:st=${totalDuration - outroPadding}:d=${outroPadding}[faded]`);
  try {
    await FfmpegContextGenerateOutput(ffmpegContext, outputFile, ["-map", "[faded]"]);

    return outputFile;
  } catch (e) {
    GraphAILogger.log(e);
    throw new Error(`AddBGMAgent ffmpeg run Error`, {
      cause: agentGenerationError("addBGMAgent", audioAction, audioFileTarget),
    });
  }
};
const addBGMAgentInfo: AgentFunctionInfo = {
  name: "addBGMAgent",
  agent: addBGMAgent,
  mock: addBGMAgent,
  samples: [],
  description: "addBGMAgent",
  category: ["ffmpeg"],
  author: "satoshi nakajima",
  repository: "https://github.com/snakajima/ai-podcaster",
  license: "MIT",
};

export default addBGMAgentInfo;
