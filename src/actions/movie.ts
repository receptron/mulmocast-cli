import { GraphAILogger, assert } from "graphai";
import {
  MulmoStudioContext,
  MulmoBeat,
  MulmoTransition,
  MulmoCanvasDimension,
  MulmoFillOption,
  MulmoVideoFilter,
  mulmoFillOptionSchema,
} from "../types/index.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { getAudioArtifactFilePath, getOutputVideoFilePath, writingMessage, isFile } from "../utils/file.js";
import { createVideoFileError, createVideoSourceError } from "../utils/error_cause.js";
import {
  FfmpegContextAddInput,
  FfmpegContextInit,
  FfmpegContextPushFormattedAudio,
  FfmpegContextGenerateOutput,
  FfmpegContext,
} from "../utils/ffmpeg_utils.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { convertVideoFilterToFFmpeg } from "../utils/video_filter.js";

// const isMac = process.platform === "darwin";
const videoCodec = "libx264"; // "h264_videotoolbox" (macOS only) is too noisy
const VIDEO_FPS = 30;
type VideoId = string | undefined;

export const getVideoPart = (
  inputIndex: number,
  isMovie: boolean,
  duration: number,
  canvasInfo: MulmoCanvasDimension,
  fillOption: MulmoFillOption,
  speed: number,
  filters?: MulmoVideoFilter[],
  frameCount?: number,
) => {
  const videoId = `v${inputIndex}`;

  const videoFilters = [];

  // Handle different media types
  const originalDuration = duration * speed;
  if (isMovie) {
    // For videos, extend with last frame if shorter than required duration
    // tpad will extend the video by cloning the last frame, then trim will ensure exact duration
    videoFilters.push(`tpad=stop_mode=clone:stop_duration=${originalDuration * 2}`); // Use 2x duration to ensure coverage
  } else {
    videoFilters.push("loop=loop=-1:size=1:start=0");
  }

  // Normalize framerate first so trim=end_frame counts frames at VIDEO_FPS,
  // regardless of the input's native framerate.
  videoFilters.push(`fps=${VIDEO_FPS}`);

  // Use frame-exact trimming when frameCount is provided to prevent cumulative drift
  // between video and audio tracks. trim=duration=X rounds up to next frame boundary,
  // causing ~0.03s extra per beat that accumulates over many beats.
  if (frameCount !== undefined && frameCount > 0) {
    // Account for speed: setpts compresses timestamps, so we need more input frames
    const inputFrameCount = Math.max(1, Math.round(frameCount * speed));
    videoFilters.push(`trim=end_frame=${inputFrameCount}`);
  } else {
    videoFilters.push(`trim=duration=${originalDuration}`);
  }

  // Apply speed if specified
  if (speed === 1.0) {
    videoFilters.push("setpts=PTS-STARTPTS");
  } else {
    videoFilters.push(`setpts=${1 / speed}*PTS`);
  }

  // Apply scaling based on fill option
  if (fillOption.style === "aspectFill") {
    // For aspect fill: scale to fill the canvas completely, cropping if necessary
    videoFilters.push(
      `scale=w=${canvasInfo.width}:h=${canvasInfo.height}:force_original_aspect_ratio=increase`,
      `crop=${canvasInfo.width}:${canvasInfo.height}`,
    );
  } else {
    // For aspect fit: scale to fit within canvas, padding if necessary
    videoFilters.push(
      `scale=w=${canvasInfo.width}:h=${canvasInfo.height}:force_original_aspect_ratio=decrease`,
      // In case of the aspect ratio mismatch, we fill the extra space with black color.
      `pad=${canvasInfo.width}:${canvasInfo.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    );
  }

  videoFilters.push("setsar=1", "format=yuv420p");

  // Apply custom video filters if specified
  if (filters && filters.length > 0) {
    filters.forEach((filter) => {
      videoFilters.push(convertVideoFilterToFFmpeg(filter));
    });
  }

  return {
    videoId,
    videoPart: `[${inputIndex}:v]` + videoFilters.join(",") + `[${videoId}]`,
  };
};

export const getAudioPart = (inputIndex: number, duration: number, delay: number, mixAudio: number) => {
  const audioId = `a${inputIndex}`;

  return {
    audioId,
    audioPart:
      `[${inputIndex}:a]` +
      `atrim=duration=${duration},` + // Trim to beat duration
      `adelay=${delay * 1000}|${delay * 1000},` +
      `volume=${mixAudio},` + // 👈 add this line
      `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo` +
      `[${audioId}]`,
  };
};

const getOutputOption = (audioId: string, videoId: string) => {
  return [
    "-preset medium", // Changed from veryfast to medium for better compression
    `-map [${videoId}]`, // Map the video stream
    `-map ${audioId}`, // Map the audio stream
    `-c:v ${videoCodec}`, // Set video codec
    ...(videoCodec === "libx264" ? ["-crf", "26"] : []), // Add CRF for libx264
    "-threads 8",
    "-filter_threads 8",
    "-b:v 2M", // Reduced from 5M to 2M
    "-bufsize",
    "4M", // Reduced buffer size
    "-maxrate",
    "3M", // Reduced from 7M to 3M
    `-r ${VIDEO_FPS}`, // Set frame rate
    "-pix_fmt yuv420p", // Set pixel format for better compatibility
    "-c:a aac", // Audio codec
    "-b:a 128k", // Audio bitrate
  ];
};

const addCaptions = (ffmpegContext: FfmpegContext, concatVideoId: string, context: MulmoStudioContext, caption: string | undefined) => {
  const beatsWithCaptions = context.studio.beats.filter(({ captionFiles }) => captionFiles && captionFiles.length > 0);
  if (caption && beatsWithCaptions.length > 0) {
    const { videoId } = beatsWithCaptions.reduce(
      (acc, beat) => {
        const { captionFiles } = beat;
        if (!captionFiles) {
          return acc;
        }

        return captionFiles.reduce((innerAcc, captionData) => {
          const { file, startAt, endAt } = captionData;
          const captionInputIndex = FfmpegContextAddInput(ffmpegContext, file);
          const compositeVideoId = `oc${innerAcc.captionIndex}`;
          ffmpegContext.filterComplex.push(
            `[${innerAcc.videoId}][${captionInputIndex}:v]overlay=format=auto:enable='between(t,${startAt},${endAt})'[${compositeVideoId}]`,
          );
          return { videoId: compositeVideoId, captionIndex: innerAcc.captionIndex + 1 };
        }, acc);
      },
      { videoId: concatVideoId, captionIndex: 0 },
    );

    return videoId;
  }
  return concatVideoId;
};

export const getOutOverlayCoords = (transitionType: string, d: number, t: number): string => {
  if (transitionType === "slideout_left") {
    return `x='-(t-${t})*W/${d}':y=0`;
  } else if (transitionType === "slideout_right") {
    return `x='(t-${t})*W/${d}':y=0`;
  } else if (transitionType === "slideout_up") {
    return `x=0:y='-(t-${t})*H/${d}'`;
  } else if (transitionType === "slideout_down") {
    return `x=0:y='(t-${t})*H/${d}'`;
  }
  throw new Error(`Unknown transition type: ${transitionType}`);
};

export const getInOverlayCoords = (transitionType: string, d: number, t: number): string => {
  if (transitionType === "slidein_left") {
    return `x='-W+(t-${t})*W/${d}':y=0`;
  } else if (transitionType === "slidein_right") {
    return `x='W-(t-${t})*W/${d}':y=0`;
  } else if (transitionType === "slidein_up") {
    return `x=0:y='H-(t-${t})*H/${d}'`;
  } else if (transitionType === "slidein_down") {
    return `x=0:y='-H+(t-${t})*H/${d}'`;
  }
  throw new Error(`Unknown transition type: ${transitionType}`);
};

const addTransitionEffects = (
  ffmpegContext: FfmpegContext,
  captionedVideoId: string,
  context: MulmoStudioContext,
  transitionVideoIds: { videoId: string; nextVideoId: VideoId; beatIndex: number }[],
  beatTimestamps: number[],
  videoIdsForBeats: VideoId[],
) => {
  if (transitionVideoIds.length === 0) {
    return captionedVideoId;
  }
  return transitionVideoIds.reduce((prevVideoId, { videoId: transitionVideoId, nextVideoId, beatIndex }) => {
    const beat = context.studio.script.beats[beatIndex];
    const transition = MulmoPresentationStyleMethods.getMovieTransition(context, beat);

    if (!transition) {
      return prevVideoId; // Skip if no transition is defined
    }
    // Transition happens at the start of this beat
    const startAt = beatTimestamps[beatIndex] - 0.05; // 0.05 is to avoid flickering

    // Limit transition duration to be no longer than either beat's duration
    const prevBeatDuration = context.studio.beats[beatIndex - 1].duration ?? 1;
    const currentBeatDuration = context.studio.beats[beatIndex].duration ?? 1;
    const duration = getClampedTransitionDuration(transition.duration, prevBeatDuration, currentBeatDuration);

    const outputVideoId = `trans_${beatIndex}_o`;
    const processedVideoId = `${transitionVideoId}_f`;

    if (transition.type === "fade") {
      // Fade out the previous beat's last frame
      ffmpegContext.filterComplex.push(
        `[${transitionVideoId}]format=yuva420p,fade=t=out:d=${duration}:alpha=1,setpts=PTS-STARTPTS+${startAt}/TB[${processedVideoId}]`,
      );
      ffmpegContext.filterComplex.push(`[${prevVideoId}][${processedVideoId}]overlay=enable='between(t,${startAt},${startAt + duration})'[${outputVideoId}]`);
    } else if (transition.type.startsWith("slideout_")) {
      // Slideout: previous beat's last frame slides out
      ffmpegContext.filterComplex.push(`[${transitionVideoId}]format=yuva420p,setpts=PTS-STARTPTS+${startAt}/TB[${processedVideoId}]`);
      ffmpegContext.filterComplex.push(
        `[${prevVideoId}][${processedVideoId}]overlay=${getOutOverlayCoords(transition.type, duration, startAt)}:enable='between(t,${startAt},${startAt + duration})'[${outputVideoId}]`,
      );
    } else if (transition.type.startsWith("slidein_")) {
      // Slidein: this beat's first frame slides in over the previous beat's last frame
      if (!nextVideoId) {
        // Cannot apply slidein without first frame
        return prevVideoId;
      }

      // Get previous beat's last frame for background
      const prevVideoSourceId = videoIdsForBeats[beatIndex - 1];
      // Both movie and image beats now have _last
      const prevLastFrame = `${prevVideoSourceId}_last`;

      // Prepare background (last frame of previous beat)
      const backgroundVideoId = `${prevLastFrame}_bg`;
      ffmpegContext.filterComplex.push(`[${prevLastFrame}]format=yuva420p,setpts=PTS-STARTPTS+${startAt}/TB[${backgroundVideoId}]`);
      // Prepare sliding frame (first frame of this beat)
      const slideinFrameId = `${nextVideoId}_f`;
      ffmpegContext.filterComplex.push(`[${nextVideoId}]format=yuva420p,setpts=PTS-STARTPTS+${startAt}/TB[${slideinFrameId}]`);
      // First overlay: put background on top of concat video
      const bgOutputId = `${prevLastFrame}_bg_o`;
      ffmpegContext.filterComplex.push(`[${prevVideoId}][${backgroundVideoId}]overlay=enable='between(t,${startAt},${startAt + duration})'[${bgOutputId}]`);
      // Second overlay: slide in the new frame on top of background
      ffmpegContext.filterComplex.push(
        `[${bgOutputId}][${slideinFrameId}]overlay=${getInOverlayCoords(transition.type, duration, startAt)}:enable='between(t,${startAt},${startAt + duration})'[${outputVideoId}]`,
      );
    } else if (transition.type.startsWith("wipe")) {
      // Wipe transition: use xfade filter between previous beat's last frame and this beat's first frame
      if (!nextVideoId) {
        // Cannot apply wipe without first frame
        return prevVideoId;
      }

      // For wipe transitions, use offset=0 so transition starts immediately and completes within duration
      // This ensures 0-100% wipe happens exactly during the transition duration
      const xfadeOffset = 0;

      // Apply xfade with offset=0 for complete 0-100% transition
      // Both input videos should be at least duration seconds long (ensured by static frame generation)
      const xfadeOutputId = `${transitionVideoId}_xfade`;
      ffmpegContext.filterComplex.push(`[${transitionVideoId}]format=yuv420p[${transitionVideoId}_fmt]`);
      ffmpegContext.filterComplex.push(`[${nextVideoId}]format=yuv420p[${nextVideoId}_fmt]`);
      ffmpegContext.filterComplex.push(
        `[${transitionVideoId}_fmt][${nextVideoId}_fmt]xfade=transition=${transition.type}:duration=${duration}:offset=${xfadeOffset}[${xfadeOutputId}]`,
      );

      // Set PTS for overlay timing
      const xfadeTimedId = `${xfadeOutputId}_t`;
      ffmpegContext.filterComplex.push(`[${xfadeOutputId}]setpts=PTS-STARTPTS+${startAt}/TB[${xfadeTimedId}]`);

      // Overlay the xfade result on the concat video
      ffmpegContext.filterComplex.push(`[${prevVideoId}][${xfadeTimedId}]overlay=enable='between(t,${startAt},${startAt + duration})'[${outputVideoId}]`);
    } else {
      throw new Error(`Unknown transition type: ${transition.type}`);
    }
    return outputVideoId;
  }, captionedVideoId);
};

export const getNeedFirstFrame = (context: MulmoStudioContext) => {
  return context.studio.script.beats.map((beat, index) => {
    if (index === 0) return false; // First beat cannot have transition
    const transition = MulmoPresentationStyleMethods.getMovieTransition(context, beat);
    return (transition?.type.startsWith("slidein_") || transition?.type.startsWith("wipe")) ?? false;
  });
};

export const getNeedLastFrame = (context: MulmoStudioContext) => {
  return context.studio.script.beats.map((beat, index) => {
    if (index === context.studio.script.beats.length - 1) return false; // Last beat doesn't need _last
    const nextTransition = MulmoPresentationStyleMethods.getMovieTransition(context, context.studio.script.beats[index + 1]);
    return nextTransition !== null; // Any transition on next beat requires this beat's last frame
  });
};

const mixAudiosFromMovieBeats = (ffmpegContext: FfmpegContext, artifactAudioId: string, audioIdsFromMovieBeats: string[]) => {
  if (audioIdsFromMovieBeats.length > 0) {
    const mainAudioId = "mainaudio";
    const compositeAudioId = "composite";
    const audioIds = audioIdsFromMovieBeats.map((id) => `[${id}]`).join("");
    FfmpegContextPushFormattedAudio(ffmpegContext, `[${artifactAudioId}]`, `[${mainAudioId}]`);
    ffmpegContext.filterComplex.push(
      `[${mainAudioId}]${audioIds}amix=inputs=${audioIdsFromMovieBeats.length + 1}:duration=first:dropout_transition=2[${compositeAudioId}]`,
    );
    return `[${compositeAudioId}]`; // notice that we need to use [mainaudio] instead of mainaudio
  }
  return artifactAudioId;
};

export const getExtraPadding = (context: MulmoStudioContext, index: number) => {
  // We need to consider only intro and outro padding because the other paddings were already added to the beat.duration
  if (index === 0) {
    return MulmoStudioContextMethods.getIntroPadding(context);
  } else if (index === context.studio.beats.length - 1) {
    return context.presentationStyle.audioParams.outroPadding;
  }
  return 0;
};

export const getFillOption = (context: MulmoStudioContext, beat: MulmoBeat) => {
  // Get fillOption from merged imageParams (global + beat-specific)
  const globalFillOption = context.presentationStyle.movieParams?.fillOption;
  const beatFillOption = beat.movieParams?.fillOption;
  const defaultFillOption = mulmoFillOptionSchema.parse({}); // let the schema infer the default value
  return { ...defaultFillOption, ...globalFillOption, ...beatFillOption };
};

export const getTransitionVideoId = (transition: MulmoTransition, videoIdsForBeats: VideoId[], index: number) => {
  if (transition.type === "fade" || transition.type.startsWith("slideout_")) {
    // Use previous beat's last frame. TODO: support voice-over
    const prevVideoSourceId = videoIdsForBeats[index - 1];
    // Both movie and image beats now have _last
    const frameId = `${prevVideoSourceId}_last`;
    return { videoId: frameId, nextVideoId: undefined, beatIndex: index };
  }
  if (transition.type.startsWith("wipe")) {
    // Wipe needs both previous beat's last frame and this beat's first frame
    const prevVideoSourceId = videoIdsForBeats[index - 1];
    const prevLastFrame = `${prevVideoSourceId}_last`;
    const nextFirstFrame = `${videoIdsForBeats[index]}_first`;
    return { videoId: prevLastFrame, nextVideoId: nextFirstFrame, beatIndex: index };
  }
  // Use this beat's first frame. slidein_ case
  return { videoId: "", nextVideoId: `${videoIdsForBeats[index]}_first`, beatIndex: index };
};

export const getConcatVideoFilter = (concatVideoId: string, videoIdsForBeats: VideoId[]) => {
  const videoIds = videoIdsForBeats.filter((id) => id !== undefined); // filter out voice-over beats

  const inputs = videoIds.map((id) => `[${id}]`).join("");
  return `${inputs}concat=n=${videoIds.length}:v=1:a=0[${concatVideoId}]`;
};

const getClampedTransitionDuration = (transitionDuration: number, prevBeatDuration: number, currentBeatDuration: number) => {
  const maxDuration = Math.min(prevBeatDuration, currentBeatDuration) * 0.9; // Use 90% to leave some margin
  return Math.min(transitionDuration, maxDuration);
};

export const getTransitionFrameDurations = (context: MulmoStudioContext, index: number) => {
  const minFrame = 1 / VIDEO_FPS;
  const beats = context.studio.beats;
  const scriptBeats = context.studio.script.beats;

  const getTransitionDuration = (transition: MulmoTransition | null, prevBeatIndex: number, currentBeatIndex: number) => {
    if (!transition || prevBeatIndex < 0 || currentBeatIndex >= beats.length) return 0;
    const prevBeatDuration = beats[prevBeatIndex].duration ?? 1;
    const currentBeatDuration = beats[currentBeatIndex].duration ?? 1;
    return getClampedTransitionDuration(transition.duration, prevBeatDuration, currentBeatDuration);
  };

  const currentTransition = MulmoPresentationStyleMethods.getMovieTransition(context, scriptBeats[index]);
  const firstDuration = index > 0 ? getTransitionDuration(currentTransition, index - 1, index) : 0;

  const nextTransition = index < scriptBeats.length - 1 ? MulmoPresentationStyleMethods.getMovieTransition(context, scriptBeats[index + 1]) : null;
  const lastDuration = getTransitionDuration(nextTransition, index, index + 1);

  return {
    firstDuration: Math.max(firstDuration, minFrame),
    lastDuration: Math.max(lastDuration, minFrame),
  };
};

export const validateBeatSource = (studioBeat: MulmoStudioContext["studio"]["beats"][number], index: number): string => {
  const sourceFile = studioBeat.lipSyncFile ?? studioBeat.soundEffectFile ?? studioBeat.movieFile ?? studioBeat.htmlImageFile ?? studioBeat.imageFile;
  assert(!!sourceFile, `studioBeat.imageFile or studioBeat.movieFile is not set: index=${index}`, false, createVideoSourceError(index));
  assert(
    isFile(sourceFile),
    `studioBeat.imageFile or studioBeat.movieFile is not exist or not file: index=${index} file=${sourceFile}`,
    false,
    createVideoFileError(index, sourceFile),
  );
  assert(!!studioBeat.duration, `studioBeat.duration is not set: index=${index}`);
  return sourceFile;
};

export const addSplitAndExtractFrames = (
  ffmpegContext: FfmpegContext,
  videoId: string,
  firstDuration: number,
  lastDuration: number,
  isMovie: boolean,
  needFirst: boolean,
  needLast: boolean,
  canvasInfo: { width: number; height: number },
): void => {
  const outputs: string[] = [`[${videoId}]`];
  if (needFirst) outputs.push(`[${videoId}_first_src]`);
  if (needLast) outputs.push(`[${videoId}_last_src]`);

  ffmpegContext.filterComplex.push(`[${videoId}]split=${outputs.length}${outputs.join("")}`);

  if (needFirst) {
    // Create static frame using nullsrc as base for proper framerate/timebase
    // Note: setpts must NOT be used here as it loses framerate metadata needed by xfade
    ffmpegContext.filterComplex.push(
      `nullsrc=size=${canvasInfo.width}x${canvasInfo.height}:duration=${firstDuration}:rate=${VIDEO_FPS}[${videoId}_first_null]`,
    );
    ffmpegContext.filterComplex.push(`[${videoId}_first_src]select='eq(n,0)',scale=${canvasInfo.width}:${canvasInfo.height}[${videoId}_first_frame]`);
    ffmpegContext.filterComplex.push(`[${videoId}_first_null][${videoId}_first_frame]overlay=format=auto,fps=${VIDEO_FPS}[${videoId}_first]`);
  }
  if (needLast) {
    if (isMovie) {
      // Movie beats: extract actual last frame
      ffmpegContext.filterComplex.push(
        `nullsrc=size=${canvasInfo.width}x${canvasInfo.height}:duration=${lastDuration}:rate=${VIDEO_FPS}[${videoId}_last_null]`,
      );
      ffmpegContext.filterComplex.push(
        `[${videoId}_last_src]reverse,select='eq(n,0)',reverse,scale=${canvasInfo.width}:${canvasInfo.height}[${videoId}_last_frame]`,
      );
      ffmpegContext.filterComplex.push(`[${videoId}_last_null][${videoId}_last_frame]overlay=format=auto,fps=${VIDEO_FPS}[${videoId}_last]`);
    } else {
      // Image beats: all frames are identical, so just select one
      ffmpegContext.filterComplex.push(
        `nullsrc=size=${canvasInfo.width}x${canvasInfo.height}:duration=${lastDuration}:rate=${VIDEO_FPS}[${videoId}_last_null]`,
      );
      ffmpegContext.filterComplex.push(`[${videoId}_last_src]select='eq(n,0)',scale=${canvasInfo.width}:${canvasInfo.height}[${videoId}_last_frame]`);
      ffmpegContext.filterComplex.push(`[${videoId}_last_null][${videoId}_last_frame]overlay=format=auto,fps=${VIDEO_FPS}[${videoId}_last]`);
    }
  }
};

const findMissingIndex = (context: MulmoStudioContext) => {
  return context.studio.beats.findIndex((studioBeat, index) => {
    const beat = context.studio.script.beats[index];
    if (beat.image?.type === "voice_over") {
      return false; // Voice-over does not have either imageFile or movieFile.
    }
    return !studioBeat.imageFile && !studioBeat.movieFile;
  });
};

export const createVideo = async (audioArtifactFilePath: string, outputVideoPath: string, context: MulmoStudioContext, isTest: boolean = false) => {
  const caption = MulmoStudioContextMethods.getCaption(context);
  const start = performance.now();
  const ffmpegContext = FfmpegContextInit();

  const missingIndex = findMissingIndex(context);
  if (missingIndex !== -1) {
    GraphAILogger.info(`ERROR: beat.imageFile or beat.movieFile is not set on beat ${missingIndex}.`);
    return false;
  }

  const canvasInfo = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);

  // Add each image input
  const videoIdsForBeats: VideoId[] = [];
  const audioIdsFromMovieBeats: string[] = [];
  const transitionVideoIds: { videoId: string; nextVideoId: VideoId; beatIndex: number }[] = [];
  const beatTimestamps: number[] = [];

  // Check which beats need _first (for slidein transition on this beat)
  const needsFirstFrame: boolean[] = getNeedFirstFrame(context);

  // Check which beats need _last (for any transition on next beat - they all need previous beat's last frame)
  const needsLastFrame: boolean[] = getNeedLastFrame(context);

  let cumulativeFrames = 0;
  context.studio.beats.reduce((timestamp, studioBeat, index) => {
    const beat = context.studio.script.beats[index];
    if (beat.image?.type === "voice_over") {
      videoIdsForBeats.push(undefined);
      beatTimestamps.push(timestamp);
      return timestamp; // Skip voice-over beats.
    }

    const sourceFile = isTest ? "/test/dummy.mp4" : validateBeatSource(studioBeat, index);

    // The movie duration is bigger in case of voice-over.
    const duration = Math.max(studioBeat.duration! + getExtraPadding(context, index), studioBeat.movieDuration ?? 0);

    // Use cumulative frame tracking to prevent audio-video drift from frame quantization.
    // trim=duration=X rounds up to the next frame boundary (~0.03s per beat at 30fps),
    // causing cumulative drift. Instead, compute exact frame counts per beat.
    const targetEndFrame = Math.round((timestamp + duration) * VIDEO_FPS);
    const frameCount = targetEndFrame - cumulativeFrames;
    cumulativeFrames = targetEndFrame;

    const inputIndex = FfmpegContextAddInput(ffmpegContext, sourceFile);
    const isMovie = !!(
      studioBeat.lipSyncFile ||
      studioBeat.movieFile ||
      MulmoPresentationStyleMethods.getImageType(context.presentationStyle, beat) === "movie"
    );
    const speed = beat.movieParams?.speed ?? 1.0;
    const filters = beat.movieParams?.filters;
    const { videoId, videoPart } = getVideoPart(inputIndex, isMovie, duration, canvasInfo, getFillOption(context, beat), speed, filters, frameCount);
    ffmpegContext.filterComplex.push(videoPart);

    // for transition
    const needFirst = needsFirstFrame[index]; // This beat has slidein
    const needLast = needsLastFrame[index]; // Next beat has transition

    videoIdsForBeats.push(videoId);
    if (needFirst || needLast) {
      const { firstDuration, lastDuration } = getTransitionFrameDurations(context, index);
      addSplitAndExtractFrames(ffmpegContext, videoId, firstDuration, lastDuration, isMovie, needFirst, needLast, canvasInfo);
    }

    // Record transition info if this beat has a transition
    const transition = MulmoPresentationStyleMethods.getMovieTransition(context, beat);
    if (transition && index > 0) {
      const transitionVideoId = getTransitionVideoId(transition, videoIdsForBeats, index);
      transitionVideoIds.push(transitionVideoId);
    }

    // NOTE: We don't support audio if the speed is not 1.0.
    const movieVolume = beat.audioParams?.movieVolume ?? 1.0;
    if (studioBeat.hasMovieAudio && movieVolume > 0.0 && speed === 1.0) {
      // TODO: Handle a special case where it has lipSyncFile AND hasMovieAudio is on (the source file has an audio, such as sound effect).
      const { audioId, audioPart } = getAudioPart(inputIndex, duration, timestamp, movieVolume);
      audioIdsFromMovieBeats.push(audioId);
      ffmpegContext.filterComplex.push(audioPart);
    }
    beatTimestamps.push(timestamp);
    return timestamp + duration;
  }, 0);

  assert(videoIdsForBeats.length === context.studio.beats.length, "videoIds.length !== studio.beats.length");
  assert(beatTimestamps.length === context.studio.beats.length, "beatTimestamps.length !== studio.beats.length");

  // Concatenate the trimmed images
  const concatVideoId = "concat_video";
  ffmpegContext.filterComplex.push(getConcatVideoFilter(concatVideoId, videoIdsForBeats));

  const captionedVideoId = addCaptions(ffmpegContext, concatVideoId, context, caption);
  const mixedVideoId = addTransitionEffects(ffmpegContext, captionedVideoId, context, transitionVideoIds, beatTimestamps, videoIdsForBeats);

  if (isTest) {
    return ffmpegContext.filterComplex;
  }

  GraphAILogger.log("filterComplex:", ffmpegContext.filterComplex.join("\n"));

  const audioIndex = FfmpegContextAddInput(ffmpegContext, audioArtifactFilePath); // Add audio input
  const ffmpegContextAudioId = mixAudiosFromMovieBeats(ffmpegContext, `${audioIndex}:a`, audioIdsFromMovieBeats);

  await FfmpegContextGenerateOutput(ffmpegContext, outputVideoPath, getOutputOption(ffmpegContextAudioId, mixedVideoId));
  const endTime = performance.now();
  GraphAILogger.info(`Video created successfully! ${Math.round(endTime - start) / 1000} sec`);
  GraphAILogger.info(context.studio.script.title);
  GraphAILogger.info((context.studio.script.references ?? []).map((reference) => `${reference.title} (${reference.url})`).join("\n"));

  return true;
};

export const movieFilePath = (context: MulmoStudioContext) => {
  const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
  const fileName = MulmoStudioContextMethods.getFileName(context);
  const caption = MulmoStudioContextMethods.getCaption(context);
  return getOutputVideoFilePath(outDirPath, fileName, context.lang, caption);
};

export const movie = async (context: MulmoStudioContext) => {
  MulmoStudioContextMethods.setSessionState(context, "video", true);
  try {
    const audioArtifactFilePath = getAudioArtifactFilePath(context);
    const outputVideoPath = movieFilePath(context);

    if (await createVideo(audioArtifactFilePath, outputVideoPath, context)) {
      writingMessage(outputVideoPath);
    }
    MulmoStudioContextMethods.setSessionState(context, "video", false, true);
    return true;
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "video", false, false);
    throw error;
  }
};
