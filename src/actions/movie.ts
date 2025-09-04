import { GraphAILogger, assert } from "graphai";
import { MulmoStudioContext, MulmoCanvasDimension, BeatMediaType, mulmoTransitionSchema, MulmoFillOption, mulmoFillOptionSchema } from "../types/index.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { getAudioArtifactFilePath, getOutputVideoFilePath, writingMessage } from "../utils/file.js";
import {
  FfmpegContextAddInput,
  FfmpegContextInit,
  FfmpegContextPushFormattedAudio,
  FfmpegContextGenerateOutput,
  FfmpegContext,
} from "../utils/ffmpeg_utils.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

// const isMac = process.platform === "darwin";
const videoCodec = "libx264"; // "h264_videotoolbox" (macOS only) is too noisy

export const getVideoPart = (
  inputIndex: number,
  mediaType: BeatMediaType,
  duration: number,
  canvasInfo: MulmoCanvasDimension,
  fillOption: MulmoFillOption,
  speed: number,
) => {
  const videoId = `v${inputIndex}`;

  const videoFilters = [];

  // Handle different media types
  const originalDuration = duration * speed;
  if (mediaType === "image") {
    videoFilters.push("loop=loop=-1:size=1:start=0");
  } else if (mediaType === "movie") {
    // For videos, extend with last frame if shorter than required duration
    // tpad will extend the video by cloning the last frame, then trim will ensure exact duration
    videoFilters.push(`tpad=stop_mode=clone:stop_duration=${originalDuration * 2}`); // Use 2x duration to ensure coverage
  }

  // Common filters for all media types
  videoFilters.push(`trim=duration=${originalDuration}`, "fps=30");

  // Apply speed if specified
  if (speed !== 1.0) {
    videoFilters.push(`setpts=${1 / speed}*PTS`);
  } else {
    videoFilters.push("setpts=PTS-STARTPTS");
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

  return {
    videoId,
    videoPart: `[${inputIndex}:v]` + videoFilters.filter((a) => a).join(",") + `[${videoId}]`,
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
    "-r 30", // Set frame rate
    "-pix_fmt yuv420p", // Set pixel format for better compatibility
    "-c:a aac", // Audio codec
    "-b:a 128k", // Audio bitrate
  ];
};

const addCaptions = (ffmpegContext: FfmpegContext, concatVideoId: string, context: MulmoStudioContext, caption: string | undefined) => {
  const beatsWithCaptions = context.studio.beats.filter(({ captionFile }) => captionFile);
  if (caption && beatsWithCaptions.length > 0) {
    const introPadding = MulmoStudioContextMethods.getIntroPadding(context);
    return beatsWithCaptions.reduce((acc, beat, index) => {
      const { startAt, duration, captionFile } = beat;
      if (startAt !== undefined && duration !== undefined && captionFile !== undefined) {
        const captionInputIndex = FfmpegContextAddInput(ffmpegContext, captionFile);
        const compositeVideoId = `oc${index}`;
        ffmpegContext.filterComplex.push(
          `[${acc}][${captionInputIndex}:v]overlay=format=auto:enable='between(t,${startAt + introPadding},${startAt + duration + introPadding})'[${compositeVideoId}]`,
        );
        return compositeVideoId;
      }
      return acc;
    }, concatVideoId);
  }
  return concatVideoId;
};

const addTransitionEffects = (
  ffmpegContext: FfmpegContext,
  captionedVideoId: string,
  context: MulmoStudioContext,
  transitionVideoIds: string[],
  beatTimestamps: number[],
) => {
  if (context.presentationStyle.movieParams?.transition && transitionVideoIds.length > 0) {
    const transition = mulmoTransitionSchema.parse(context.presentationStyle.movieParams.transition);

    return transitionVideoIds.reduce((acc, transitionVideoId, index) => {
      const transitionStartTime = beatTimestamps[index + 1] - 0.05; // 0.05 is to avoid flickering
      const processedVideoId = `${transitionVideoId}_f`;
      let transitionFilter;
      if (transition.type === "fade") {
        transitionFilter = `[${transitionVideoId}]format=yuva420p,fade=t=out:d=${transition.duration}:alpha=1,setpts=PTS-STARTPTS+${transitionStartTime}/TB[${processedVideoId}]`;
      } else if (transition.type === "slideout_left") {
        transitionFilter = `[${transitionVideoId}]format=yuva420p,setpts=PTS-STARTPTS+${transitionStartTime}/TB[${processedVideoId}]`;
      } else {
        throw new Error(`Unknown transition type: ${transition.type}`);
      }
      ffmpegContext.filterComplex.push(transitionFilter);
      const outputId = `${transitionVideoId}_o`;
      if (transition.type === "fade") {
        ffmpegContext.filterComplex.push(
          `[${acc}][${processedVideoId}]overlay=enable='between(t,${transitionStartTime},${transitionStartTime + transition.duration})'[${outputId}]`,
        );
      } else if (transition.type === "slideout_left") {
        ffmpegContext.filterComplex.push(
          `[${acc}][${processedVideoId}]overlay=x='-(t-${transitionStartTime})*W/${transition.duration}':y=0:enable='between(t,${transitionStartTime},${transitionStartTime + transition.duration})'[${outputId}]`,
        );
      }
      return outputId;
    }, captionedVideoId);
  }
  return captionedVideoId;
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

const createVideo = async (audioArtifactFilePath: string, outputVideoPath: string, context: MulmoStudioContext) => {
  const caption = MulmoStudioContextMethods.getCaption(context);
  const start = performance.now();
  const ffmpegContext = FfmpegContextInit();

  const missingIndex = context.studio.beats.findIndex((studioBeat, index) => {
    const beat = context.studio.script.beats[index];
    if (beat.image?.type === "voice_over") {
      return false; // Voice-over does not have either imageFile or movieFile.
    }
    return !studioBeat.imageFile && !studioBeat.movieFile;
  });
  if (missingIndex !== -1) {
    GraphAILogger.info(`ERROR: beat.imageFile or beat.movieFile is not set on beat ${missingIndex}.`);
    return false;
  }

  const canvasInfo = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);

  // Add each image input
  const videoIdsForBeats: (string | undefined)[] = [];
  const audioIdsFromMovieBeats: string[] = [];
  const transitionVideoIds: string[] = [];
  const beatTimestamps: number[] = [];

  context.studio.beats.reduce((timestamp, studioBeat, index) => {
    const beat = context.studio.script.beats[index];
    if (beat.image?.type === "voice_over") {
      videoIdsForBeats.push(undefined);
      beatTimestamps.push(timestamp);
      return timestamp; // Skip voice-over beats.
    }
    const sourceFile = studioBeat.lipSyncFile ?? studioBeat.soundEffectFile ?? studioBeat.movieFile ?? studioBeat.htmlImageFile ?? studioBeat.imageFile;
    assert(!!sourceFile, `studioBeat.imageFile or studioBeat.movieFile is not set: index=${index}`);
    assert(!!studioBeat.duration, `studioBeat.duration is not set: index=${index}`);
    const extraPadding = (() => {
      // We need to consider only intro and outro padding because the other paddings were already added to the beat.duration
      if (index === 0) {
        return MulmoStudioContextMethods.getIntroPadding(context);
      } else if (index === context.studio.beats.length - 1) {
        return context.presentationStyle.audioParams.outroPadding;
      }
      return 0;
    })();

    // The movie duration is bigger in case of voice-over.
    const duration = Math.max(studioBeat.duration + extraPadding, studioBeat.movieDuration ?? 0);

    // Get fillOption from merged imageParams (global + beat-specific)
    const globalFillOption = context.presentationStyle.movieParams?.fillOption;
    const beatFillOption = beat.movieParams?.fillOption;
    const defaultFillOption = mulmoFillOptionSchema.parse({}); // let the schema infer the default value
    const fillOption = { ...defaultFillOption, ...globalFillOption, ...beatFillOption };

    const inputIndex = FfmpegContextAddInput(ffmpegContext, sourceFile);
    const mediaType = studioBeat.lipSyncFile || studioBeat.movieFile ? "movie" : MulmoPresentationStyleMethods.getImageType(context.presentationStyle, beat);
    const speed = beat.movieParams?.speed ?? 1.0;
    const { videoId, videoPart } = getVideoPart(inputIndex, mediaType, duration, canvasInfo, fillOption, speed);
    ffmpegContext.filterComplex.push(videoPart);

    if (context.presentationStyle.movieParams?.transition && index < context.studio.beats.length - 1) {
      // NOTE: We split the video into two parts for transition.
      ffmpegContext.filterComplex.push(`[${videoId}]split=2[${videoId}_0][${videoId}_1]`);
      videoIdsForBeats.push(`${videoId}_0`);
      if (mediaType === "movie") {
        // For movie beats, extract the last frame for transition
        ffmpegContext.filterComplex.push(
          `[${videoId}_1]reverse,select='eq(n,0)',reverse,tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${videoId}_2]`,
        );
        transitionVideoIds.push(`${videoId}_2`);
      } else {
        transitionVideoIds.push(`${videoId}_1`);
      }
    } else {
      videoIdsForBeats.push(videoId);
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

  // console.log("*** images", images.audioIds);

  // Concatenate the trimmed images
  const concatVideoId = "concat_video";
  const videoIds = videoIdsForBeats.filter((id) => id !== undefined); // filter out voice-over beats

  const inputs = videoIds.map((id) => `[${id}]`).join("");
  const filter = `${inputs}concat=n=${videoIds.length}:v=1:a=0[${concatVideoId}]`;
  ffmpegContext.filterComplex.push(filter);

  const captionedVideoId = addCaptions(ffmpegContext, concatVideoId, context, caption);
  const mixedVideoId = addTransitionEffects(ffmpegContext, captionedVideoId, context, transitionVideoIds, beatTimestamps);

  GraphAILogger.log("filterComplex:", ffmpegContext.filterComplex.join("\n"));

  const audioIndex = FfmpegContextAddInput(ffmpegContext, audioArtifactFilePath); // Add audio input
  const artifactAudioId = `${audioIndex}:a`;

  const ffmpegContextAudioId = mixAudiosFromMovieBeats(ffmpegContext, artifactAudioId, audioIdsFromMovieBeats);

  // GraphAILogger.debug("filterComplex", ffmpegContext.filterComplex);

  await FfmpegContextGenerateOutput(ffmpegContext, outputVideoPath, getOutputOption(ffmpegContextAudioId, mixedVideoId));
  const end = performance.now();
  GraphAILogger.info(`Video created successfully! ${Math.round(end - start) / 1000} sec`);
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
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "video", false);
  }
};
