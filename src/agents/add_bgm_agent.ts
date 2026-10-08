import { GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { MulmoStudioContext } from "../types/index.js";
import { FfmpegContext, FfmpegContextAddInput, FfmpegContextInit, FfmpegContextGenerateOutput, ffmpegGetMediaDuration } from "../utils/ffmpeg_utils.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { MulmoMediaSourceMethods } from "../methods/mulmo_media_source.js";
import { isFile } from "../utils/file.js";
import { userAssert } from "../utils/utils.js";
import { getJingleFilePath } from "../utils/jinglescript.js";
import { agentGenerationError, agentFileNotExistError, audioAction, audioFileTarget } from "../utils/error_cause.js";

export const resolveAddBgmMixParams = (audioParams: MulmoStudioContext["presentationStyle"]["audioParams"]) => {
  const useExplicitMix = audioParams.ttsVolume !== undefined;
  const ttsVolume = audioParams.ttsVolume ?? 1.0;
  return {
    useExplicitMix,
    voiceVolume: audioParams.audioVolume * ttsVolume,
  };
};

export const resolveAddBgmFilterConfig = (useExplicitMix: boolean, mixedInputId: string = "mixed") => {
  const amixNormalize = useExplicitMix ? ":normalize=0" : "";
  return {
    amixNormalize,
    mixedOutputId: useExplicitMix ? "mixed_limited" : mixedInputId,
    limiterFilter: useExplicitMix ? `[${mixedInputId}]alimiter=limit=0.95:attack=5:release=50[mixed_limited]` : undefined,
  };
};

export type SoundEffectPlacement = { file: string; startAt: number; volume: number; duration?: number; loop: boolean };

// Absolute placement of every beat's sound effects on the final audio timeline.
// The context must come from combineAudioFilesAgent, which sets studio.beats[].startAt.
export const getSoundEffectPlacements = (context: MulmoStudioContext): SoundEffectPlacement[] => {
  const introPadding = MulmoStudioContextMethods.getIntroPadding(context);
  return context.studio.script.beats.flatMap((beat, index) =>
    (beat.soundEffects ?? []).map((soundEffect, seIndex) => {
      const beatStartAt = context.studio.beats[index]?.startAt;
      userAssert(beatStartAt !== undefined, `soundEffects: startAt of beat ${index} is not computed yet`);
      const { source } = soundEffect;
      const file = source.kind === "jinglescript" ? getJingleFilePath(source.score, context) : MulmoMediaSourceMethods.resolve(source, context);
      userAssert(!!file, `soundEffects: unsupported source at beat ${index}, effect ${seIndex} (use url or path)`);
      const startAt = soundEffect.startAt ?? 0;
      const loop = soundEffect.loop ?? false;
      // A looping effect without duration plays until the end of the beat.
      const duration = soundEffect.duration ?? (loop ? (context.studio.beats[index]?.duration ?? 0) - startAt : undefined);
      userAssert(duration === undefined || duration > 0, `soundEffects: beat ${index}, effect ${seIndex} starts after the end of the beat`);
      return {
        file,
        startAt: introPadding + beatStartAt + startAt,
        volume: soundEffect.volume ?? 1.0,
        ...(duration !== undefined ? { duration } : {}),
        loop,
      };
    }),
  );
};

// In legacy mode, amix (normalize=1) halves the voice and the music. Sound effects are mixed in
// afterwards with normalize=0, so apply the same factor to keep volume 1.0 at the gain of the narration at its
// default volume. audioVolume / ttsVolume deliberately do not scale sound effects.
export const soundEffectGain = (useExplicitMix: boolean) => (useExplicitMix ? 1.0 : 0.5);

const soundEffectFadeOut = 0.05; // seconds, avoids a click where the effect is cut

const getSoundEffectTrim = (duration: number) => {
  const fade = Math.min(soundEffectFadeOut, duration);
  return `atrim=duration=${duration}, afade=t=out:st=${duration - fade}:d=${fade}, `;
};

export const buildSoundEffectFilters = (inputIds: number[], placements: SoundEffectPlacement[], gain: number, outputId: string) => {
  const ids = placements.map((_, index) => `se_${index}`);
  const filters = placements.map((placement, index) => {
    const delayMs = Math.round(placement.startAt * 1000);
    const trim = placement.duration !== undefined ? getSoundEffectTrim(placement.duration) : "";
    return `[${inputIds[index]}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, ${trim}volume=${placement.volume * gain}, adelay=${delayMs}|${delayMs}[${ids[index]}]`;
  });
  if (ids.length === 1) {
    return [...filters, `[${ids[0]}]anull[${outputId}]`];
  }
  const inputs = ids.map((id) => "[" + id + "]").join("");
  return [...filters, `${inputs}amix=inputs=${ids.length}:duration=longest:normalize=0[${outputId}]`];
};

// Adds the beats' sound effects to ffmpegContext and mixes them onto [mixed].
// Returns the id of the resulting stream ("mixed" when there are none).
export const addSoundEffects = (ffmpegContext: FfmpegContext, context: MulmoStudioContext) => {
  const { useExplicitMix } = resolveAddBgmMixParams(context.presentationStyle.audioParams);
  const soundEffects = getSoundEffectPlacements(context);
  if (soundEffects.length === 0) {
    return "mixed";
  }
  soundEffects.forEach(({ file }) => {
    if (!/^https?:\/\//.test(file) && !isFile(file)) {
      throw new Error(`AddBGMAgent soundEffect file not exist: ${file}`, {
        cause: agentFileNotExistError("addBGMAgent", audioAction, audioFileTarget, file),
      });
    }
  });
  GraphAILogger.log("soundEffects:", soundEffects);
  const inputIds = soundEffects.map(({ file, loop }) => FfmpegContextAddInput(ffmpegContext, file, loop ? ["-stream_loop", "-1"] : undefined));
  ffmpegContext.filterComplex.push(...buildSoundEffectFilters(inputIds, soundEffects, soundEffectGain(useExplicitMix), "sfx"));
  ffmpegContext.filterComplex.push("[mixed][sfx]amix=inputs=2:duration=first:normalize=0[mixed_sfx]");
  return "mixed_sfx";
};

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
  const audioParams = context.presentationStyle.audioParams;
  const { useExplicitMix, voiceVolume } = resolveAddBgmMixParams(audioParams);

  ffmpegContext.filterComplex.push(
    `[${musicInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, volume=${audioParams.bgmVolume}[music]`,
  );
  ffmpegContext.filterComplex.push(
    `[${voiceInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo, volume=${voiceVolume}, adelay=${introPadding * 1000}|${introPadding * 1000}[voice]`,
  );
  const { amixNormalize } = resolveAddBgmFilterConfig(useExplicitMix);
  ffmpegContext.filterComplex.push(`[music][voice]amix=inputs=2:duration=longest${amixNormalize}[mixed]`);
  const mixedInputId = addSoundEffects(ffmpegContext, context);
  const { mixedOutputId, limiterFilter } = resolveAddBgmFilterConfig(useExplicitMix, mixedInputId);
  if (limiterFilter) {
    ffmpegContext.filterComplex.push(limiterFilter);
  }
  ffmpegContext.filterComplex.push(`[${mixedOutputId}]atrim=start=0:end=${totalDuration}[trimmed]`);
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
