import { GraphAILogger, assert } from "graphai";
import { MulmoStudio, MulmoStudioContext, MulmoCanvasDimension, BeatMediaType, mulmoTransitionSchema } from "../types/index.js";
import { MulmoScriptMethods } from "../methods/index.js";
import { getAudioArtifactFilePath, getOutputVideoFilePath, writingMessage } from "../utils/file.js";
import { FfmpegContextAddInput, FfmpegContextInit, FfmpegContextPushFormattedAudio, FfmpegContextGenerateOutput } from "../utils/ffmpeg_utils.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

// const isMac = process.platform === "darwin";
const videoCodec = "libx264"; // "h264_videotoolbox" (macOS only) is too noisy

export const getVideoPart = (inputIndex: number, mediaType: BeatMediaType, duration: number, canvasInfo: MulmoCanvasDimension) => {
  const videoId = `v${inputIndex}`;

  const videoFilters = [];

  // Handle different media types
  if (mediaType === "image") {
    videoFilters.push("loop=loop=-1:size=1:start=0");
  } else if (mediaType === "movie") {
    // For videos, extend with last frame if shorter than required duration
    // tpad will extend the video by cloning the last frame, then trim will ensure exact duration
    videoFilters.push(`tpad=stop_mode=clone:stop_duration=${duration * 2}`); // Use 2x duration to ensure coverage
  }

  // Common filters for all media types
  videoFilters.push(
    `trim=duration=${duration}`,
    "fps=30",
    "setpts=PTS-STARTPTS",
    `scale=w=${canvasInfo.width}:h=${canvasInfo.height}:force_original_aspect_ratio=decrease`,
    // In case of the aspect ratio mismatch, we fill the extra space with black color.
    `pad=${canvasInfo.width}:${canvasInfo.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "setsar=1",
    "format=yuv420p",
  );

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

const createVideo = async (audioArtifactFilePath: string, outputVideoPath: string, studio: MulmoStudio, caption: string | undefined) => {
  const start = performance.now();
  const ffmpegContext = FfmpegContextInit();

  const missingIndex = studio.beats.findIndex((beat) => !beat.imageFile && !beat.movieFile);
  if (missingIndex !== -1) {
    GraphAILogger.info(`ERROR: beat.imageFile or beat.movieFile is not set on beat ${missingIndex}.`);
    return false;
  }

  const canvasInfo = MulmoScriptMethods.getCanvasSize(studio.script);

  // Add each image input
  const filterComplexVideoIds: string[] = [];
  const filterComplexAudioIds: string[] = [];
  const transitionVideoIds: string[] = [];
  const beatTimestamps: number[] = [];

  studio.beats.reduce((timestamp, studioBeat, index) => {
    const beat = studio.script.beats[index];
    const sourceFile = studioBeat.movieFile ?? studioBeat.imageFile;
    if (!sourceFile) {
      throw new Error(`studioBeat.imageFile or studioBeat.movieFile is not set: index=${index}`);
    }
    if (!studioBeat.duration) {
      throw new Error(`studioBeat.duration is not set: index=${index}`);
    }
    const inputIndex = FfmpegContextAddInput(ffmpegContext, sourceFile);
    const mediaType = studioBeat.movieFile ? "movie" : MulmoScriptMethods.getImageType(studio.script, beat);
    const extraPadding = (() => {
      // We need to consider only intro and outro padding because the other paddings were already added to the beat.duration
      if (index === 0) {
        return studio.script.audioParams.introPadding;
      } else if (index === studio.beats.length - 1) {
        return studio.script.audioParams.outroPadding;
      }
      return 0;
    })();
    const duration = studioBeat.duration + extraPadding;
    const { videoId, videoPart } = getVideoPart(inputIndex, mediaType, duration, canvasInfo);
    ffmpegContext.filterComplex.push(videoPart);
    if (caption && studioBeat.captionFile) {
      const captionInputIndex = FfmpegContextAddInput(ffmpegContext, studioBeat.captionFile);
      const compositeVideoId = `c${index}`;
      ffmpegContext.filterComplex.push(`[${videoId}][${captionInputIndex}:v]overlay=format=auto[${compositeVideoId}]`);
      filterComplexVideoIds.push(compositeVideoId);
    } else {
      filterComplexVideoIds.push(videoId);
    }
    if (studio.script.movieParams?.transition && index < studio.beats.length - 1) {
      const sourceId = filterComplexVideoIds.pop();
      ffmpegContext.filterComplex.push(`[${sourceId}]split=2[${sourceId}_0][${sourceId}_1]`);
      filterComplexVideoIds.push(`${sourceId}_0`);
      if (mediaType === "movie") {
        // For movie beats, extract the last frame for transition
        ffmpegContext.filterComplex.push(
          `[${sourceId}_1]reverse,select='eq(n,0)',reverse,tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${sourceId}_2]`,
        );
        transitionVideoIds.push(`${sourceId}_2`);
      } else {
        transitionVideoIds.push(`${sourceId}_1`);
      }
    }

    if (beat.image?.type == "movie" && beat.image.mixAudio > 0.0) {
      const { audioId, audioPart } = getAudioPart(inputIndex, duration, timestamp, beat.image.mixAudio);
      filterComplexAudioIds.push(audioId);
      ffmpegContext.filterComplex.push(audioPart);
    }
    beatTimestamps.push(timestamp);
    return timestamp + duration;
  }, 0);

  assert(filterComplexVideoIds.length === studio.beats.length, "videoIds.length !== studio.beats.length");
  assert(beatTimestamps.length === studio.beats.length, "beatTimestamps.length !== studio.beats.length");

  // console.log("*** images", images.audioIds);

  // Concatenate the trimmed images
  const concatVideoId = "concat_video";
  ffmpegContext.filterComplex.push(`${filterComplexVideoIds.map((id) => `[${id}]`).join("")}concat=n=${studio.beats.length}:v=1:a=0[${concatVideoId}]`);

  // Add tranditions if needed
  const mixedVideoId = (() => {
    if (studio.script.movieParams?.transition && transitionVideoIds.length > 0) {
      const transition = mulmoTransitionSchema.parse(studio.script.movieParams.transition);

      return transitionVideoIds.reduce((acc, transitionVideoId, index) => {
        const transitionStartTime = beatTimestamps[index + 1] - 0.05; // 0.05 is to avoid flickering
        const processedVideoId = `${transitionVideoId}_f`;
        // If we can to add other transition types than fade, we need to add them here.
        ffmpegContext.filterComplex.push(
          `[${transitionVideoId}]format=yuva420p,fade=t=out:d=${transition.duration}:alpha=1,setpts=PTS-STARTPTS+${transitionStartTime}/TB[${processedVideoId}]`,
        );
        const outputId = `${transitionVideoId}_o`;
        ffmpegContext.filterComplex.push(
          `[${acc}][${processedVideoId}]overlay=enable='between(t,${transitionStartTime},${transitionStartTime + transition.duration})'[${outputId}]`,
        );
        return outputId;
      }, concatVideoId);
    }
    return concatVideoId;
  })();

  const audioIndex = FfmpegContextAddInput(ffmpegContext, audioArtifactFilePath); // Add audio input
  const artifactAudioId = `${audioIndex}:a`;

  const ffmpegContextAudioId = (() => {
    if (filterComplexAudioIds.length > 0) {
      const mainAudioId = "mainaudio";
      const compositeAudioId = "composite";
      const audioIds = filterComplexAudioIds.map((id) => `[${id}]`).join("");
      FfmpegContextPushFormattedAudio(ffmpegContext, `[${artifactAudioId}]`, `[${mainAudioId}]`);
      ffmpegContext.filterComplex.push(
        `[${mainAudioId}]${audioIds}amix=inputs=${filterComplexAudioIds.length + 1}:duration=first:dropout_transition=2[${compositeAudioId}]`,
      );
      return `[${compositeAudioId}]`; // notice that we need to use [mainaudio] instead of mainaudio
    }
    return artifactAudioId;
  })();

  // GraphAILogger.debug("filterComplex", ffmpegContext.filterComplex);

  await FfmpegContextGenerateOutput(ffmpegContext, outputVideoPath, getOutputOption(ffmpegContextAudioId, mixedVideoId));
  const end = performance.now();
  GraphAILogger.info(`Video created successfully! ${Math.round(end - start) / 1000} sec`);
  GraphAILogger.info(studio.script.title);
  GraphAILogger.info((studio.script.references ?? []).map((reference) => `${reference.title} (${reference.url})`).join("\n"));

  return true;
};

export const movieFilePath = (context: MulmoStudioContext) => {
  const { studio, fileDirs, caption } = context;
  return getOutputVideoFilePath(fileDirs.outDirPath, studio.filename, context.lang, caption);
};

export const movie = async (context: MulmoStudioContext) => {
  MulmoStudioContextMethods.setSessionState(context, "video", true);
  try {
    const { studio, fileDirs, caption } = context;
    const { outDirPath } = fileDirs;
    const audioArtifactFilePath = getAudioArtifactFilePath(outDirPath, studio.filename);
    const outputVideoPath = movieFilePath(context);

    if (await createVideo(audioArtifactFilePath, outputVideoPath, studio, caption)) {
      writingMessage(outputVideoPath);
    }
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "video", false);
  }
};
