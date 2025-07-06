import { assert, GraphAILogger } from "graphai";
import type { AgentFunction, AgentFunctionInfo } from "graphai";
import { MulmoStudio, MulmoStudioContext, MulmoStudioBeat, MulmoBeat } from "../types/index.js";
import { silent60secPath } from "../utils/file.js";
import { FfmpegContextInit, FfmpegContextGenerateOutput, FfmpegContextInputFormattedAudio, ffmpegGetMediaDuration } from "../utils/ffmpeg_utils.js";
import { userAssert } from "../utils/utils.js";

const getMovieDulation = async (beat: MulmoBeat) => {
  if (beat.image?.type === "movie" && (beat.image.source.kind === "url" || beat.image.source.kind === "path")) {
    const pathOrUrl = beat.image.source.kind === "url" ? beat.image.source.url : beat.image.source.path;
    const speed = beat.movieParams?.speed ?? 1.0;
    return (await ffmpegGetMediaDuration(pathOrUrl)) / speed;
  }
  return 0;
};

const getPadding = (context: MulmoStudioContext, beat: MulmoBeat, index: number) => {
  if (beat.audioParams?.padding !== undefined) {
    return beat.audioParams.padding;
  }
  if (index === context.studio.beats.length - 1) {
    return 0;
  }
  const isClosingGap = index === context.studio.beats.length - 2;
  return isClosingGap ? context.presentationStyle.audioParams.closingPadding : context.presentationStyle.audioParams.padding;
};

const getTotalPadding = (padding: number, movieDuration: number, audioDuration: number, duration?: number) => {
  if (movieDuration > 0) {
    return padding + (movieDuration - audioDuration);
  } else if (duration && duration > audioDuration) {
    return padding + (duration - audioDuration);
  }
  return padding;
};

const getMediaDurations = (context: MulmoStudioContext) => {
  return Promise.all(
    context.studio.beats.map(async (studioBeat: MulmoStudioBeat, index: number) => {
      const beat = context.studio.script.beats[index];
      const movieDuration = await getMovieDulation(beat);
      const audioDuration = studioBeat.audioFile ? await ffmpegGetMediaDuration(studioBeat.audioFile) : 0;
      return {
        movieDuration,
        audioDuration,
        hasMedia: movieDuration + audioDuration > 0,
        silenceDuration: 0,
      };
    }),
  );
};

const getGroupBeatDurations = (context: MulmoStudioContext, group: number[], audioDuration: number) => {
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

const combineAudioFilesAgent: AgentFunction<null, { studio: MulmoStudio }, { context: MulmoStudioContext; combinedFileName: string }> = async ({
  namedInputs,
}) => {
  const { context, combinedFileName } = namedInputs;
  const ffmpegContext = FfmpegContextInit();

  // First, get the audio durations of all beats, taking advantage of multi-threading capability of ffmpeg.
  const mediaDurations = await getMediaDurations(context);

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
      const group = [index];
      for (let i = index + 1; i < context.studio.beats.length && context.studio.script.beats[i].image?.type === "voice_over"; i++) {
        group.push(i);
      }
      if (group.length > 1) {
        let remaining = movieDuration;
        group.forEach((idx, iGroup) => {
          const subBeatDurations = mediaDurations[idx];
          userAssert(
            subBeatDurations.audioDuration <= remaining,
            `subBeatDurations.audioDuration(${subBeatDurations.audioDuration}) > remaining(${remaining})`,
          );
          if (iGroup === group.length - 1) {
            beatDurations.push(remaining);
            subBeatDurations.silenceDuration = remaining - subBeatDurations.audioDuration;
            remaining = 0;
            return;
          }
          const nextBeat = context.studio.script.beats[idx + 1];
          assert(nextBeat.image?.type === "voice_over", "nextBeat.image.type !== voice_over");
          const voiceStartAt = nextBeat.image?.startAt;
          if (voiceStartAt) {
            const remainingDuration = movieDuration - voiceStartAt;
            const duration = remaining - remainingDuration;
            userAssert(duration >= 0, `duration(${duration}) < 0`);
            beatDurations.push(duration);
            subBeatDurations.silenceDuration = duration - subBeatDurations.audioDuration;
            userAssert(subBeatDurations.silenceDuration >= 0, `subBeatDurations.silenceDuration(${subBeatDurations.silenceDuration}) < 0`);
            remaining = remainingDuration;
            return;
          }
          beatDurations.push(subBeatDurations.audioDuration);
          remaining = remaining - subBeatDurations.audioDuration;
        });
        return;
      }
    }

    // Check if the current beat has media and the next beat does not have media.
    if (audioDuration > 0) {
      // Check if the current beat has spilled over audio.
      const group = [index];
      for (let i = index + 1; i < context.studio.beats.length && !mediaDurations[i].hasMedia; i++) {
        group.push(i);
      }
      if (group.length > 1) {
        const groupBeatsDurations = getGroupBeatDurations(context, group, audioDuration);
        // Yes, the current beat has spilled over audio.
        const beatsTotalDuration = groupBeatsDurations.reduce((a, b) => a + b, 0);
        if (beatsTotalDuration > audioDuration + 0.01) {
          // 0.01 is a tolerance to avoid floating point precision issues
          let remaining = audioDuration;
          group.forEach((idx, iGroup) => {
            if (remaining >= groupBeatsDurations[iGroup]) {
              remaining -= groupBeatsDurations[iGroup];
            } else {
              mediaDurations[idx].silenceDuration = groupBeatsDurations[iGroup] - remaining;
              remaining = 0;
            }
          });
        } else {
          // Last beat gets the rest of the audio.
          if (audioDuration > beatsTotalDuration) {
            groupBeatsDurations[groupBeatsDurations.length - 1] += audioDuration - beatsTotalDuration;
          }
        }
        beatDurations.push(...groupBeatsDurations);
      } else {
        // No spilled over audio.
        assert(beatDurations.length === index, "beatDurations.length !== index");
        // padding is the amount of audio padding specified in the script.
        const padding = getPadding(context, beat, index);
        // totalPadding is the amount of audio padding to be added to the audio file.
        const totalPadding = Math.round(getTotalPadding(padding, movieDuration, audioDuration, beat.duration) * 100) / 100;
        const beatDuration = audioDuration + totalPadding;
        beatDurations.push(beatDuration);
        if (totalPadding > 0) {
          mediaDurations[index].silenceDuration = totalPadding;
        }
      }
    } else if (movieDuration > 0) {
      // This beat has only a movie, not audio.
      beatDurations.push(movieDuration);
      mediaDurations[index].silenceDuration = movieDuration;
    } else {
      // The current beat has no audio, nor no spilled over audio
      const beatDuration = beat.duration ?? (movieDuration > 0 ? movieDuration : 1.0);
      beatDurations.push(beatDuration);
      mediaDurations[index].silenceDuration = beatDuration;
    }
  });
  assert(beatDurations.length === context.studio.beats.length, "beatDurations.length !== studio.beats.length");

  // We cannot reuse longSilentId. We need to explicitly split it for each beat.
  const silentIds = mediaDurations.filter((md) => md.silenceDuration > 0).map((_, index) => `[ls_${index}]`);
  if (silentIds.length > 0) {
    const longSilentId = FfmpegContextInputFormattedAudio(ffmpegContext, silent60secPath(), undefined, ["-stream_loop", "-1"]);
    ffmpegContext.filterComplex.push(`${longSilentId}asplit=${silentIds.length}${silentIds.join("")}`);
  }

  const inputIds: string[] = [];

  context.studio.beats.forEach((studioBeat: MulmoStudioBeat, index: number) => {
    const { silenceDuration } = mediaDurations[index];
    const paddingId = `[padding_${index}]`;
    if (studioBeat.audioFile) {
      const audioId = FfmpegContextInputFormattedAudio(ffmpegContext, studioBeat.audioFile);
      inputIds.push(audioId);
    }
    if (silenceDuration > 0) {
      const silentId = silentIds.pop();
      ffmpegContext.filterComplex.push(`${silentId}atrim=start=0:end=${silenceDuration}${paddingId}`);
      inputIds.push(paddingId);
    }
  });

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
