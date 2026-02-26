import { assert, GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { MulmoStudio, MulmoStudioContext, MulmoStudioBeat, MulmoBeat } from "../types/index.js";
import { silent60secPath, isFile } from "../utils/file.js";
import {
  FfmpegContext,
  FfmpegContextInit,
  FfmpegContextGenerateOutput,
  FfmpegContextInputFormattedAudio,
  ffmpegGetMediaDuration,
} from "../utils/ffmpeg_utils.js";
import { MulmoMediaSourceMethods } from "../methods/mulmo_media_source.js";
import { MulmoBeatMethods } from "../methods/index.js";
import { userAssert } from "../utils/utils.js";
import { getAudioInputIdsError } from "../utils/error_cause.js";

const getMovieDuration = async (context: MulmoStudioContext, beat: MulmoBeat) => {
  if (beat.image?.type === "movie") {
    const pathOrUrl = MulmoMediaSourceMethods.resolve(beat.image.source, context);
    if (pathOrUrl) {
      const speed = beat.movieParams?.speed ?? 1.0;
      const { duration, hasAudio } = await ffmpegGetMediaDuration(pathOrUrl);
      return { duration: duration / speed, hasAudio };
    }
  }
  // Animated html_tailwind beats with explicit duration act as movie-like for voice_over grouping
  if (MulmoBeatMethods.isAnimatedHtmlTailwind(beat) && beat.duration !== undefined) {
    return { duration: beat.duration, hasAudio: false };
  }
  return { duration: 0, hasAudio: false };
};

export const getPadding = (context: MulmoStudioContext, beat: MulmoBeat, index: number) => {
  if (beat.audioParams?.padding !== undefined) {
    return beat.audioParams.padding;
  }
  if (index === context.studio.beats.length - 1) {
    return 0;
  }
  const isClosingGap = index === context.studio.beats.length - 2;
  return isClosingGap ? context.presentationStyle.audioParams.closingPadding : context.presentationStyle.audioParams.padding;
};

export const getTotalPadding = (padding: number, movieDuration: number, audioDuration: number, duration?: number) => {
  if (movieDuration > 0) {
    return padding + (movieDuration - audioDuration);
  } else if (duration && duration > audioDuration) {
    return padding + (duration - audioDuration);
  }
  return padding;
};

export type MediaDuration = {
  movieDuration: number;
  audioDuration: number;
  hasMedia: boolean;
  silenceDuration: number;
  hasMovieAudio: boolean;
};
const getMediaDurationsOfAllBeats = (context: MulmoStudioContext): Promise<MediaDuration[]> => {
  return Promise.all(
    context.studio.beats.map(async (studioBeat: MulmoStudioBeat, index: number) => {
      const beat = context.studio.script.beats[index];
      const { duration: movieDuration, hasAudio: hasMovieAudio } = await getMovieDuration(context, beat);
      const audioDuration = studioBeat.audioFile ? (await ffmpegGetMediaDuration(studioBeat.audioFile)).duration : 0;
      return {
        movieDuration,
        audioDuration,
        hasMedia: movieDuration + audioDuration > 0,
        silenceDuration: 0,
        hasMovieAudio,
      };
    }),
  );
};

export const getGroupBeatDurations = (context: MulmoStudioContext, group: number[], audioDuration: number) => {
  const specifiedSum = group
    .map((idx) => context.studio.script.beats[idx].duration)
    .filter((d) => d !== undefined)
    .reduce((a, b) => a + b, 0);
  const unspecified = group.filter((idx) => context.studio.script.beats[idx].duration === undefined);
  const minTotal = 1.0 * unspecified.length;
  const rest = Math.max(audioDuration - specifiedSum, minTotal);
  const durationForUnspecified = rest / (unspecified.length || 1);

  const durations = group.map((idx) => {
    const duration = context.studio.script.beats[idx].duration;
    if (duration === undefined) {
      return durationForUnspecified;
    }
    return duration;
  });
  return durations;
};

const getInputIds = (context: MulmoStudioContext, mediaDurations: MediaDuration[], ffmpegContext: FfmpegContext, silentIds: string[]) => {
  const inputIds: string[] = [];
  context.studio.beats.forEach((studioBeat: MulmoStudioBeat, index: number) => {
    const { silenceDuration } = mediaDurations[index];
    const paddingId = `[padding_${index}]`;
    if (studioBeat.audioFile) {
      if (!/^https?:\/\//.test(studioBeat.audioFile)) {
        assert(
          isFile(studioBeat.audioFile),
          `studioBeat.audioFile is not exist or not file: index=${index} file=${studioBeat.audioFile}`,
          false,
          getAudioInputIdsError(index, studioBeat.audioFile),
        );
      }
      const audioId = FfmpegContextInputFormattedAudio(ffmpegContext, studioBeat.audioFile);
      inputIds.push(audioId);
    }
    if (silenceDuration > 0) {
      const silentId = silentIds.pop();
      ffmpegContext.filterComplex.push(`${silentId}atrim=start=0:end=${silenceDuration}${paddingId}`);
      inputIds.push(paddingId);
    }
  });
  return inputIds;
};

export const voiceOverProcess = (
  context: MulmoStudioContext,
  mediaDurations: MediaDuration[],
  movieDuration: number,
  beatDurations: number[],
  groupLength: number,
) => {
  return (remaining: number, idx: number, iGroup: number) => {
    const subBeatDurations = mediaDurations[idx];
    userAssert(
      subBeatDurations.audioDuration <= remaining,
      `Duration Overflow: At index(${idx}) audioDuration(${subBeatDurations.audioDuration}) > remaining(${remaining})`,
    );
    if (iGroup === groupLength - 1) {
      beatDurations.push(remaining);
      subBeatDurations.silenceDuration = remaining - subBeatDurations.audioDuration;
      return 0;
    }
    const nextBeat = context.studio.script.beats[idx + 1];
    assert(nextBeat.image?.type === "voice_over", "nextBeat.image.type !== voice_over");
    const voiceStartAt = nextBeat.image?.startAt;
    if (voiceStartAt) {
      const remainingDuration = movieDuration - voiceStartAt;
      const duration = remaining - remainingDuration;
      userAssert(duration >= 0, `Invalid startAt: At index(${idx}), available duration(${duration}) < 0`);
      beatDurations.push(duration);
      subBeatDurations.silenceDuration = duration - subBeatDurations.audioDuration;
      userAssert(subBeatDurations.silenceDuration >= 0, `Duration Overwrap: At index(${idx}), silenceDuration(${subBeatDurations.silenceDuration}) < 0`);
      return remainingDuration;
    }
    beatDurations.push(subBeatDurations.audioDuration);
    return remaining - subBeatDurations.audioDuration;
  };
};

const getVoiceOverGroup = (context: MulmoStudioContext, index: number) => {
  const group = [index];
  for (let i = index + 1; i < context.studio.beats.length && context.studio.script.beats[i].image?.type === "voice_over"; i++) {
    group.push(i);
  }
  return group;
};

const getSpillOverGroup = (context: MulmoStudioContext, mediaDurations: MediaDuration[], index: number) => {
  const group = [index];
  for (let i = index + 1; i < context.studio.beats.length && !mediaDurations[i].hasMedia; i++) {
    group.push(i);
  }
  return group;
};

export const spilledOverAudio = (
  context: MulmoStudioContext,
  group: number[],
  audioDuration: number,
  beatDurations: number[],
  mediaDurations: MediaDuration[],
) => {
  const groupBeatsDurations = getGroupBeatDurations(context, group, audioDuration);
  // Yes, the current beat has spilled over audio.
  const beatsTotalDuration = groupBeatsDurations.reduce((a, b) => a + b, 0);
  if (beatsTotalDuration > audioDuration + 0.01) {
    // 0.01 is a tolerance to avoid floating point precision issues
    group.reduce((remaining, idx, iGroup) => {
      if (remaining >= groupBeatsDurations[iGroup]) {
        return remaining - groupBeatsDurations[iGroup];
      }
      mediaDurations[idx].silenceDuration = groupBeatsDurations[iGroup] - remaining;
      return 0;
    }, audioDuration);
  } else if (audioDuration > beatsTotalDuration) {
    // Last beat gets the rest of the audio.
    groupBeatsDurations[groupBeatsDurations.length - 1] += audioDuration - beatsTotalDuration;
  }
  beatDurations.push(...groupBeatsDurations);
};

export const noSpilledOverAudio = (
  context: MulmoStudioContext,
  beat: MulmoBeat,
  index: number,
  movieDuration: number,
  audioDuration: number,
  beatDurations: number[],
  mediaDurations: MediaDuration[],
) => {
  // padding is the amount of audio padding specified in the script.
  const padding = getPadding(context, beat, index);
  // totalPadding is the amount of audio padding to be added to the audio file.
  const totalPadding = Math.round(getTotalPadding(padding, movieDuration, audioDuration, beat.duration) * 100) / 100;
  const beatDuration = audioDuration + totalPadding;
  beatDurations.push(beatDuration);
  if (totalPadding > 0) {
    mediaDurations[index].silenceDuration = totalPadding;
  }
};

export const updateDurations = (context: MulmoStudioContext, mediaDurations: MediaDuration[]) => {
  const beatDurations: number[] = [];

  context.studio.script.beats.forEach((beat: MulmoBeat, index: number) => {
    if (beatDurations.length > index) {
      // The current beat has already been processed.
      return;
    }
    assert(beatDurations.length === index, "beatDurations.length !== index");
    const { audioDuration, movieDuration } = mediaDurations[index];
    // Check if we are processing a voice-over beat.
    if (movieDuration > 0) {
      const group = getVoiceOverGroup(context, index);
      if (group.length > 1) {
        GraphAILogger.log(`Voice over group: ${group.length}`);
        group.reduce(voiceOverProcess(context, mediaDurations, movieDuration, beatDurations, group.length), movieDuration);
        return;
      }
    }

    // Check if the current beat has media and the next beat does not have media.
    if (audioDuration > 0) {
      // Check if the current beat has spilled over audio.
      const group = getSpillOverGroup(context, mediaDurations, index);
      if (group.length > 1) {
        GraphAILogger.log(`Spill over group: ${group.length}`);
        spilledOverAudio(context, group, audioDuration, beatDurations, mediaDurations);
        return;
      }
      // No spilled over audio.
      assert(beatDurations.length === index, "beatDurations.length !== index");
      noSpilledOverAudio(context, beat, index, movieDuration, audioDuration, beatDurations, mediaDurations);
      return;
    }
    if (movieDuration > 0) {
      // This beat has only a movie, not audio.
      beatDurations.push(movieDuration);
      mediaDurations[index].silenceDuration = movieDuration;
      return;
    }
    // The current beat has no audio, nor no spilled over audio
    const beatDuration = beat.duration ?? 1.0;
    beatDurations.push(beatDuration);
    mediaDurations[index].silenceDuration = beatDuration;
  });
  return beatDurations;
};

const combineAudioFilesAgent: AgentFunction<null, { studio: MulmoStudio }, { context: MulmoStudioContext; combinedFileName: string }> = async ({
  namedInputs,
}) => {
  const { context, combinedFileName } = namedInputs;

  // First, get the audio durations of all beats, taking advantage of multi-threading capability of ffmpeg.
  const mediaDurations = await getMediaDurationsOfAllBeats(context);
  const ffmpegContext = FfmpegContextInit();

  const beatDurations = updateDurations(context, mediaDurations);
  assert(beatDurations.length === context.studio.beats.length, "beatDurations.length !== studio.beats.length");

  // We cannot reuse longSilentId. We need to explicitly split it for each beat.
  const silentIds = mediaDurations.filter((md) => md.silenceDuration > 0).map((_, index) => `[ls_${index}]`);
  if (silentIds.length > 0) {
    const longSilentId = FfmpegContextInputFormattedAudio(ffmpegContext, silent60secPath(), undefined, ["-stream_loop", "-1"]);
    ffmpegContext.filterComplex.push(`${longSilentId}asplit=${silentIds.length}${silentIds.join("")}`);
  }

  const inputIds = getInputIds(context, mediaDurations, ffmpegContext, silentIds);

  assert(silentIds.length === 0, "silentIds.length !== 0");

  GraphAILogger.log("filterComplex:", ffmpegContext.filterComplex.join("\n"));

  // Finally, combine all audio files.
  ffmpegContext.filterComplex.push(`${inputIds.join("")}concat=n=${inputIds.length}:v=0:a=1[aout]`);
  await FfmpegContextGenerateOutput(ffmpegContext, combinedFileName, ["-map", "[aout]"]);

  const result = {
    studio: {
      ...context.studio,
      beats: context.studio.beats.map((studioBeat, index) => ({
        ...studioBeat,
        duration: beatDurations[index],
        audioDuration: mediaDurations[index].audioDuration,
        movieDuration: mediaDurations[index].movieDuration,
        silenceDuration: mediaDurations[index].silenceDuration,
        hasMovieAudio: mediaDurations[index].hasMovieAudio,
      })),
    },
  };
  result.studio.beats.reduce((acc, beat) => {
    beat.startAt = acc;
    return acc + beat.duration;
  }, 0);
  // context.studio = result.studio; // TODO: removing this breaks test/test_movie.ts
  return {
    ...context,
    ...result,
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
