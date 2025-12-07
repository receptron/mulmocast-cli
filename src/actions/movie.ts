import { GraphAILogger, assert } from "graphai";
import { MulmoStudioContext, MulmoCanvasDimension, BeatMediaType, MulmoFillOption, mulmoFillOptionSchema } from "../types/index.js";
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
    return beatsWithCaptions.reduce((prevVideoId, beat, index) => {
      const { startAt, duration, captionFile } = beat;
      if (startAt !== undefined && duration !== undefined && captionFile !== undefined) {
        const captionInputIndex = FfmpegContextAddInput(ffmpegContext, captionFile);
        const compositeVideoId = `oc${index}`;
        ffmpegContext.filterComplex.push(
          `[${prevVideoId}][${captionInputIndex}:v]overlay=format=auto:enable='between(t,${startAt + introPadding},${startAt + duration + introPadding})'[${compositeVideoId}]`,
        );
        return compositeVideoId;
      }
      return prevVideoId;
    }, concatVideoId);
  }
  return concatVideoId;
};

const addTransitionEffects = (
  ffmpegContext: FfmpegContext,
  captionedVideoId: string,
  context: MulmoStudioContext,
  transitionVideoIds: { videoId: string; nextVideoId: string | undefined; beatIndex: number }[],
  beatTimestamps: number[],
  videoIdsForBeats: (string | undefined)[],
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
    const transitionStartTime = beatTimestamps[beatIndex] - 0.05; // 0.05 is to avoid flickering
    const t = transitionStartTime;
    const d = transition.duration;
    const outputVideoId = `trans_${beatIndex}_o`;

    if (transition.type === "fade") {
      // Fade out the previous beat's last frame
      const processedVideoId = `${transitionVideoId}_f`;
      ffmpegContext.filterComplex.push(`[${transitionVideoId}]format=yuva420p,fade=t=out:d=${d}:alpha=1,setpts=PTS-STARTPTS+${t}/TB[${processedVideoId}]`);
      ffmpegContext.filterComplex.push(`[${prevVideoId}][${processedVideoId}]overlay=enable='between(t,${t},${t + d})'[${outputVideoId}]`);
    } else if (transition.type.startsWith("slideout_")) {
      // Slideout: previous beat's last frame slides out
      const processedVideoId = `${transitionVideoId}_f`;
      ffmpegContext.filterComplex.push(`[${transitionVideoId}]format=yuva420p,setpts=PTS-STARTPTS+${t}/TB[${processedVideoId}]`);

      const overlayCoords = (() => {
        if (transition.type === "slideout_left") {
          return `x='-(t-${t})*W/${d}':y=0`;
        } else if (transition.type === "slideout_right") {
          return `x='(t-${t})*W/${d}':y=0`;
        } else if (transition.type === "slideout_up") {
          return `x=0:y='-(t-${t})*H/${d}'`;
        } else if (transition.type === "slideout_down") {
          return `x=0:y='(t-${t})*H/${d}'`;
        }
        throw new Error(`Unknown transition type: ${transition.type}`);
      })();

      ffmpegContext.filterComplex.push(`[${prevVideoId}][${processedVideoId}]overlay=${overlayCoords}:enable='between(t,${t},${t + d})'[${outputVideoId}]`);
    } else if (transition.type.startsWith("slidein_")) {
      // Slidein: this beat's first frame slides in over the previous beat's last frame
      if (!nextVideoId) {
        // Cannot apply slidein without first frame
        return prevVideoId;
      }

      // Get previous beat's last frame for background
      const prevBeatIndex = beatIndex - 1;
      const prevVideoSourceId = videoIdsForBeats[prevBeatIndex];
      const prevVideoId2 = prevVideoSourceId?.endsWith("_0") ? prevVideoSourceId.slice(0, -2) : prevVideoSourceId;
      const prevMediaType = context.studio.beats[prevBeatIndex].movieFile ? "movie" : "image";
      // Determine which frame to use for previous beat (same logic as transition recording)
      // Check if previous beat has slidein (needs _2 for image, _last for movie)
      const prevBeatHasSlidein =
        context.studio.script.beats[prevBeatIndex] &&
        MulmoPresentationStyleMethods.getMovieTransition(context, context.studio.script.beats[prevBeatIndex])?.type.startsWith("slidein_");
      let prevLastFrame: string;
      if (prevMediaType === "movie") {
        prevLastFrame = `${prevVideoId2}_last`;
      } else if (prevBeatHasSlidein) {
        prevLastFrame = `${prevVideoId2}_2`;
      } else {
        prevLastFrame = `${prevVideoId2}_1`;
      }

      // Prepare background (last frame of previous beat)
      const backgroundVideoId = `${prevLastFrame}_bg`;
      ffmpegContext.filterComplex.push(`[${prevLastFrame}]format=yuva420p,setpts=PTS-STARTPTS+${t}/TB[${backgroundVideoId}]`);

      // Prepare sliding frame (first frame of this beat)
      const processedVideoId = `${nextVideoId}_f`;
      ffmpegContext.filterComplex.push(`[${nextVideoId}]format=yuva420p,setpts=PTS-STARTPTS+${t}/TB[${processedVideoId}]`);

      let overlayCoords: string;
      if (transition.type === "slidein_left") {
        overlayCoords = `x='-W+(t-${t})*W/${d}':y=0`;
      } else if (transition.type === "slidein_right") {
        overlayCoords = `x='W-(t-${t})*W/${d}':y=0`;
      } else if (transition.type === "slidein_up") {
        overlayCoords = `x=0:y='H-(t-${t})*H/${d}'`;
      } else if (transition.type === "slidein_down") {
        overlayCoords = `x=0:y='-H+(t-${t})*H/${d}'`;
      } else {
        throw new Error(`Unknown transition type: ${transition.type}`);
      }

      // First overlay: put background on top of concat video
      const bgOutputId = `${prevLastFrame}_bg_o`;
      ffmpegContext.filterComplex.push(`[${prevVideoId}][${backgroundVideoId}]overlay=enable='between(t,${t},${t + d})'[${bgOutputId}]`);

      // Second overlay: slide in the new frame on top of background
      ffmpegContext.filterComplex.push(`[${bgOutputId}][${processedVideoId}]overlay=${overlayCoords}:enable='between(t,${t},${t + d})'[${outputVideoId}]`);
    } else {
      throw new Error(`Unknown transition type: ${transition.type}`);
    }
    return outputVideoId;
  }, captionedVideoId);
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
  const transitionVideoIds: { videoId: string; nextVideoId: string | undefined; beatIndex: number }[] = [];
  const beatTimestamps: number[] = [];

  // Check which beats need _first (for slidein transition on this beat)
  const needsFirstFrame: boolean[] = context.studio.script.beats.map((beat, index) => {
    if (index === 0) return false; // First beat cannot have transition
    const transition = MulmoPresentationStyleMethods.getMovieTransition(context, beat);
    return transition?.type.startsWith("slidein_") ?? false;
  });

  // Check which beats need _last (for any transition on next beat - they all need previous beat's last frame)
  const needsLastFrame: boolean[] = context.studio.script.beats.map((beat, index) => {
    if (index === context.studio.script.beats.length - 1) return false; // Last beat doesn't need _last
    const nextBeat = context.studio.script.beats[index + 1];
    const nextTransition = MulmoPresentationStyleMethods.getMovieTransition(context, nextBeat);
    return nextTransition !== null; // Any transition on next beat requires this beat's last frame
  });

  context.studio.beats.reduce((timestamp, studioBeat, index) => {
    const beat = context.studio.script.beats[index];
    if (beat.image?.type === "voice_over") {
      videoIdsForBeats.push(undefined);
      beatTimestamps.push(timestamp);
      return timestamp; // Skip voice-over beats.
    }
    const sourceFile = studioBeat.lipSyncFile ?? studioBeat.soundEffectFile ?? studioBeat.movieFile ?? studioBeat.htmlImageFile ?? studioBeat.imageFile;
    assert(!!sourceFile, `studioBeat.imageFile or studioBeat.movieFile is not set: index=${index}`, false, createVideoSourceError(index));
    assert(
      isFile(sourceFile),
      `studioBeat.imageFile or studioBeat.movieFile is not exist or not file: index=${index} file=${sourceFile}`,
      false,
      createVideoFileError(index, sourceFile),
    );
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

    const transition = MulmoPresentationStyleMethods.getMovieTransition(context, beat);
    const needFirst = needsFirstFrame[index]; // This beat has slidein
    const needLast = needsLastFrame[index]; // Next beat has slideout/fade

    if (needFirst && needLast) {
      // Need both first frame (for this beat's slidein) and last frame (for next beat's transition)
      ffmpegContext.filterComplex.push(`[${videoId}]split=3[${videoId}_0][${videoId}_1][${videoId}_2]`);
      videoIdsForBeats.push(`${videoId}_0`);

      // Extract first frame for slidein
      ffmpegContext.filterComplex.push(
        `[${videoId}_1]select='eq(n,0)',tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${videoId}_first]`,
      );

      // Extract last frame for next beat's transition
      // For image beats, the last frame is the same as any frame, so we can use _2 directly
      // For movie beats, we need to extract the actual last frame
      if (mediaType === "movie") {
        ffmpegContext.filterComplex.push(
          `[${videoId}_2]reverse,select='eq(n,0)',reverse,tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${videoId}_last]`,
        );
      }
      // Note: for image beats, _2 will be used as the last frame (no extraction needed)
    } else if (needFirst) {
      // Only need first frame (for this beat's slidein)
      ffmpegContext.filterComplex.push(`[${videoId}]split=2[${videoId}_0][${videoId}_1]`);
      videoIdsForBeats.push(`${videoId}_0`);

      // Extract first frame for slidein
      ffmpegContext.filterComplex.push(
        `[${videoId}_1]select='eq(n,0)',tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${videoId}_first]`,
      );
    } else if (needLast) {
      // Only need last frame (for next beat's slideout/fade)
      ffmpegContext.filterComplex.push(`[${videoId}]split=2[${videoId}_0][${videoId}_1]`);
      videoIdsForBeats.push(`${videoId}_0`);

      // Extract last frame for next beat's slideout/fade
      if (mediaType === "movie") {
        ffmpegContext.filterComplex.push(
          `[${videoId}_1]reverse,select='eq(n,0)',reverse,tpad=stop_mode=clone:stop_duration=${duration},fps=30,setpts=PTS-STARTPTS[${videoId}_last]`,
        );
      }
    } else {
      // No split needed
      videoIdsForBeats.push(videoId);
    }

    // Record transition info if this beat has a transition
    if (transition && index > 0) {
      // transition.type can be: fade, slideout_*, slidein_*
      if (transition.type === "fade" || transition.type.startsWith("slideout_")) {
        // Use previous beat's last frame
        const prevVideoSourceId = videoIdsForBeats[index - 1];
        const prevVideoId = prevVideoSourceId?.endsWith("_0") ? prevVideoSourceId.slice(0, -2) : prevVideoSourceId;
        const prevMediaType = context.studio.beats[index - 1].movieFile ? "movie" : "image";
        // If previous beat has both first and last, image beat uses _2, movie beat uses _last
        // If previous beat has only last, image beat uses _1, movie beat uses _last
        const prevNeedsFirst = needsFirstFrame[index - 1];
        let frameId: string;
        if (prevMediaType === "movie") {
          frameId = `${prevVideoId}_last`;
        } else if (prevNeedsFirst) {
          frameId = `${prevVideoId}_2`;
        } else {
          frameId = `${prevVideoId}_1`;
        }
        transitionVideoIds.push({ videoId: frameId, nextVideoId: undefined, beatIndex: index });
      } else if (transition.type.startsWith("slidein_")) {
        // Use this beat's first frame
        const currentVideoSourceId = videoIdsForBeats[index];
        const currentVideoId = currentVideoSourceId?.endsWith("_0") ? currentVideoSourceId.slice(0, -2) : currentVideoSourceId;
        transitionVideoIds.push({ videoId: "", nextVideoId: `${currentVideoId}_first`, beatIndex: index });
      }
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
  const mixedVideoId = addTransitionEffects(ffmpegContext, captionedVideoId, context, transitionVideoIds, beatTimestamps, videoIdsForBeats);

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
    MulmoStudioContextMethods.setSessionState(context, "video", false, true);
    return true;
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "video", false, false);
    throw error;
  }
};
