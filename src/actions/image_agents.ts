import fs from "fs";
import { createHash } from "crypto";
import { GraphAILogger } from "graphai";
import { MulmoStudioContext, MulmoBeat, MulmoCanvasDimension, MulmoImageParams, MulmoMovieParams, Text2ImageAgentInfo } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods, MulmoBeatMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import {
  getBeatPngImagePath,
  getBeatMoviePaths,
  getBeatAnimatedVideoPath,
  getAudioFilePath,
  getGroupedAudioFilePath,
  getReferenceImagePath,
} from "../utils/file.js";
import { ffmpegGetImageDimensions, padImageToCanvas } from "../utils/ffmpeg_utils.js";
import { imagePrompt, htmlImageSystemPrompt } from "../utils/prompt.js";
import { renderHTMLToImage } from "../utils/html_render.js";
import { beatId } from "../utils/utils.js";
import { localizedPath } from "./audio.js";

const htmlStyle = (context: MulmoStudioContext, beat: MulmoBeat) => {
  return {
    canvasSize: MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle),
    textSlideStyle: MulmoPresentationStyleMethods.getTextSlideStyle(context.presentationStyle, beat),
  };
};

type ImagePreprocessAgentReturnValue = {
  imageParams?: MulmoImageParams;
  movieFile?: string;
  beatDuration?: number;
  soundEffectFile?: string;
  soundEffectPrompt?: string;
  soundEffectModel?: string;
  soundEffectAgentInfo?: { agentName: string; defaultModel: string };
  lipSyncFile?: string;
  lipSyncModel?: string;
  lipSyncAgentName?: string;
  lipSyncTrimAudio?: boolean; // instruction to trim audio from the BGM
  startAt?: number;
  duration?: number;
  bgmFile?: string | null;
  audioFile?: string;
  movieAgentInfo?: { agent: string; movieParams: MulmoMovieParams };
  firstFrameImagePath?: string;
  lastFrameImagePath?: string;
  movieReferenceImages?: { imagePath: string; referenceType: "ASSET" | "STYLE" }[];
};

type ImagePreprocessAgentResponseBase = ImagePreprocessAgentReturnValue & {
  imagePath?: string;
};

type ImageGenearalPreprocessAgentResponse = ImagePreprocessAgentResponseBase & {
  imageAgentInfo: Text2ImageAgentInfo;
  prompt: string;
  referenceImages: string[];
  referenceImageForMovie: string;
};

type ImageHtmlPreprocessAgentResponse = {
  imagePath: string;
  htmlPrompt: string;
  htmlPath: string;
  htmlImageSystemPrompt: string;
  htmlImageFile: string;
};
type ImageOnlyMoviePreprocessAgentResponse = ImagePreprocessAgentResponseBase & {
  imageFromMovie: boolean;
  useLastFrame?: boolean;
};

type ImagePluginPreprocessAgentResponse = ImagePreprocessAgentResponseBase & {
  referenceImageForMovie: string;
  markdown: string;
  html: string;
};

// Image-to-video models expect first/last frame images that match the video canvas.
// Generated reference images come back at the provider's fixed sizes (e.g. gpt-image emits
// 1536x1024), so aspect-fit pad them to the canvas before movie generation.
const conformingInFlight = new Map<string, Promise<string>>();

// Aspect-matching sources never get a destPath, so without this memo every beat
// (and every rerun) would ffprobe them again. Keyed by path + mtime.
const imageDimensionsCache = new Map<string, { width: number; height: number }>();

const getImageDimensionsCached = async (imagePath: string, mtimeMs: number) => {
  const key = `${imagePath}:${mtimeMs}`;
  const cached = imageDimensionsCache.get(key);
  if (cached) {
    return cached;
  }
  const dimensions = await ffmpegGetImageDimensions(imagePath);
  imageDimensionsCache.set(key, dimensions);
  return dimensions;
};

export const conformFrameImageToCanvas = async (context: MulmoStudioContext, imageName: string, imagePath: string, fillColor: string): Promise<string> => {
  if (!fs.existsSync(imagePath)) {
    return imagePath; // mock agents / dry runs
  }
  const canvasSize = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);
  // The cache key includes the source path and fill color: the same ref name can resolve
  // to different sources in different beats, and a color change must invalidate the cache.
  const digest = createHash("sha256").update(`${imagePath}|${fillColor}`).digest("hex").slice(0, 8);
  const destPath = getReferenceImagePath(context, `${imageName}_fit_${canvasSize.width}x${canvasSize.height}_${digest}`, "png");
  const inFlight = conformingInFlight.get(destPath);
  if (inFlight) {
    return inFlight;
  }
  const promise = (async () => {
    const sourceMtimeMs = fs.statSync(imagePath).mtimeMs;
    if (fs.existsSync(destPath) && fs.statSync(destPath).mtimeMs >= sourceMtimeMs) {
      return destPath;
    }
    const { width, height } = await getImageDimensionsCached(imagePath, sourceMtimeMs);
    if (Math.abs(width / height - canvasSize.width / canvasSize.height) < 0.01) {
      return imagePath;
    }
    GraphAILogger.info(`conformFrameImageToCanvas: padding ${imageName} (${width}x${height}) to ${canvasSize.width}x${canvasSize.height}`);
    try {
      await padImageToCanvas(imagePath, destPath, canvasSize.width, canvasSize.height, fillColor);
    } catch (error) {
      fs.rmSync(destPath, { force: true }); // don't let a partial file poison the mtime cache
      throw error;
    }
    return destPath;
  })();
  conformingInFlight.set(destPath, promise);
  try {
    return await promise;
  } finally {
    conformingInFlight.delete(destPath);
  }
};

type ImagePreprocessAgentResponse =
  | ImagePreprocessAgentResponseBase
  | ImageHtmlPreprocessAgentResponse
  | ImagePluginPreprocessAgentResponse
  | ImageOnlyMoviePreprocessAgentResponse
  | ImageGenearalPreprocessAgentResponse;

export const imagePreprocessAgent = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  imageRefs?: Record<string, string>;
}): Promise<ImagePreprocessAgentResponse> => {
  const { context, beat, index, imageRefs } = namedInputs;

  const studioBeat = context.studio.beats[index];
  const { imagePath, htmlImageFile } = getBeatPngImagePath(context, index);
  if (beat.htmlPrompt) {
    const htmlPrompt = MulmoBeatMethods.getHtmlPrompt(beat);
    const htmlPath = imagePath.replace(/\.[^/.]+$/, ".html");
    // ImageHtmlPreprocessAgentResponse
    return { imagePath, htmlPrompt, htmlImageFile, htmlPath, htmlImageSystemPrompt: htmlImageSystemPrompt(context.presentationStyle.canvasSize) };
  }

  const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(context.presentationStyle, beat);
  const moviePaths = getBeatMoviePaths(context, index);
  const returnValue: ImagePreprocessAgentReturnValue = {
    imageParams: imageAgentInfo.imageParams,
    movieFile: beat.moviePrompt ? moviePaths.movieFile : undefined,
    beatDuration: beat.duration ?? studioBeat?.duration,
  };

  const isMovie = Boolean(beat.moviePrompt || beat?.image?.type === "movie");
  if (beat.soundEffectPrompt) {
    if (isMovie) {
      returnValue.soundEffectAgentInfo = MulmoPresentationStyleMethods.getSoundEffectAgentInfo(context.presentationStyle, beat);
      returnValue.soundEffectModel =
        beat.soundEffectParams?.model ?? context.presentationStyle.soundEffectParams?.model ?? returnValue.soundEffectAgentInfo.defaultModel;
      returnValue.soundEffectFile = moviePaths.soundEffectFile;
      returnValue.soundEffectPrompt = beat.soundEffectPrompt;
    } else {
      GraphAILogger.warn(`soundEffectPrompt is set, but there is no video. beat: ${index}`);
    }
  }

  if (beat.enableLipSync) {
    const lipSyncAgentInfo = MulmoPresentationStyleMethods.getLipSyncAgentInfo(context.presentationStyle, beat);
    returnValue.lipSyncAgentName = lipSyncAgentInfo.agentName;
    returnValue.lipSyncModel = beat.lipSyncParams?.model ?? context.presentationStyle.lipSyncParams?.model ?? lipSyncAgentInfo.defaultModel;
    returnValue.lipSyncFile = moviePaths.lipSyncFile;
    if (context.studio.script.audioParams?.suppressSpeech) {
      // studio beat may ot have startAt and duration yet, in case of API call from the app.
      returnValue.startAt = context.studio.script.beats.filter((_, i) => i < index).reduce((acc, curr) => acc + (curr.duration ?? 0), 0);
      returnValue.duration = beat.duration ?? 0;
      returnValue.lipSyncTrimAudio = true;
      returnValue.bgmFile = MulmoMediaSourceMethods.resolve(context.studio.script.audioParams.bgm, context);
      const folderName = MulmoStudioContextMethods.getFileName(context);
      const audioDirPath = MulmoStudioContextMethods.getAudioDirPath(context);
      const trimmedName = `${beatId(beat.id, index)}_trimmed`;
      returnValue.audioFile = context.fileDirs.grouped
        ? getGroupedAudioFilePath(audioDirPath, trimmedName)
        : getAudioFilePath(audioDirPath, folderName, trimmedName);
    } else {
      // Audio file will be set from the beat's audio file when available
      const lang = context.lang ?? context.studio.script.lang;
      returnValue.audioFile = studioBeat?.audioFile ?? localizedPath(context, beat, index, lang);
    }
  }

  returnValue.movieAgentInfo = MulmoPresentationStyleMethods.getMovieAgentInfo(context.presentationStyle, beat);

  // Resolve movie reference images from imageRefs.
  // Shallow-merge like getMovieAgentInfo: beat-level fields override style-level fields
  // individually, so a beat setting only lastFrameImageName keeps the global frameFillColor.
  const movieParams = { ...context.presentationStyle.movieParams, ...beat.movieParams };
  const frameFillColor = movieParams.frameFillColor ?? "black";
  if (movieParams.firstFrameImageName && imageRefs) {
    const firstFramePath = imageRefs[movieParams.firstFrameImageName];
    if (firstFramePath) {
      returnValue.firstFrameImagePath = await conformFrameImageToCanvas(context, movieParams.firstFrameImageName, firstFramePath, frameFillColor);
    }
  }
  if (movieParams.lastFrameImageName && imageRefs) {
    const lastFramePath = imageRefs[movieParams.lastFrameImageName];
    if (lastFramePath) {
      returnValue.lastFrameImagePath = await conformFrameImageToCanvas(context, movieParams.lastFrameImageName, lastFramePath, frameFillColor);
    }
  }
  if (movieParams.referenceImages && imageRefs) {
    returnValue.movieReferenceImages = movieParams.referenceImages
      .map((ref) => {
        const refPath = imageRefs[ref.imageName];
        return refPath ? { imagePath: refPath, referenceType: ref.referenceType } : undefined;
      })
      .filter((r): r is { imagePath: string; referenceType: "ASSET" | "STYLE" } => r !== undefined);
  }

  if (beat.image) {
    const plugin = MulmoBeatMethods.getPlugin(beat);
    const pluginPath = plugin.path({ beat, context, imagePath, ...htmlStyle(context, beat) });

    const markdown = plugin.markdown ? plugin.markdown({ beat, context, imagePath, ...htmlStyle(context, beat) }) : undefined;
    const html = plugin.html ? await plugin.html({ beat, context, imagePath, ...htmlStyle(context, beat) }) : undefined;

    const isTypeMovie = beat.image.type === "movie";
    const isAnimatedHtml = MulmoBeatMethods.isAnimatedHtmlTailwind(beat);

    // animation and moviePrompt cannot be used together
    if (isAnimatedHtml && beat.moviePrompt) {
      throw new Error("html_tailwind animation and moviePrompt cannot be used together on the same beat. Use either animation or moviePrompt, not both.");
    }

    if (isAnimatedHtml) {
      const animatedVideoPath = getBeatAnimatedVideoPath(context, index);
      // ImagePluginPreprocessAgentResponse
      // imageFromMovie is false: the plugin generates both the .mp4 video AND
      // a high-quality final-frame PNG directly from HTML (better than extracting from compressed video).
      return {
        ...returnValue,
        imagePath, // static final-frame PNG (generated by the plugin)
        movieFile: animatedVideoPath, // .mp4 path for the pipeline
        referenceImageForMovie: pluginPath,
        markdown,
        html,
      };
    }

    // undefined prompt indicates that image generation is not needed
    // ImagePluginPreprocessAgentResponse
    return {
      ...returnValue,
      // imagePath: isTypeMovie ? undefined : pluginPath,
      imagePath: isTypeMovie ? imagePath : pluginPath,
      movieFile: isTypeMovie ? pluginPath : returnValue.movieFile,
      imageFromMovie: isTypeMovie,
      referenceImageForMovie: pluginPath,
      markdown,
      html,
    };
  }

  if (beat.moviePrompt && !beat.imagePrompt) {
    // ImageOnlyMoviePreprocessAgentResponse
    // If firstFrameImageName is specified, use the resolved ref image as the movie's first frame
    const base = { ...returnValue, imagePath, imageFromMovie: true };
    return returnValue.firstFrameImagePath ? { ...base, referenceImageForMovie: returnValue.firstFrameImagePath } : base;
  }

  // referenceImages for "edit_image", openai agent.
  const referenceImages = MulmoBeatMethods.getImageReferenceForImageGenerator(beat, imageRefs ?? {});

  const prompt = imagePrompt(beat, imageAgentInfo.imageParams.style);
  // ImageGenearalPreprocessAgentResponse
  // firstFrameImagePath (from movieParams.firstFrameImageName) takes precedence over generated image
  const movieFirstFramePath = returnValue.firstFrameImagePath ?? imagePath;
  return { ...returnValue, imagePath, referenceImageForMovie: movieFirstFramePath, imageAgentInfo, prompt, referenceImages };
};

export const imagePluginAgent = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  imageRefs?: Record<string, string>;
  movieRefs?: Record<string, string>;
}) => {
  const { context, beat, index, imageRefs, movieRefs } = namedInputs;
  const { imagePath } = getBeatPngImagePath(context, index);

  const plugin = MulmoBeatMethods.getPlugin(beat);

  // For animated html_tailwind, use the .mp4 path so the plugin writes video there
  const isAnimatedHtml = MulmoBeatMethods.isAnimatedHtmlTailwind(beat);
  const effectiveImagePath = isAnimatedHtml ? getBeatAnimatedVideoPath(context, index) : imagePath;

  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, true);
    const studioBeat = context.studio.beats[index];
    const beatDuration = beat.duration ?? studioBeat?.duration;
    const processorParams = { beat, context, imagePath: effectiveImagePath, imageRefs, movieRefs, beatDuration, ...htmlStyle(context, beat) };
    await plugin.process(processorParams);
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, false);
  } catch (error) {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, false);
    throw error;
  }
};

export const htmlImageGeneratorAgent = async (namedInputs: { file: string; canvasSize: MulmoCanvasDimension; htmlText: string }) => {
  const { file, canvasSize, htmlText } = namedInputs;
  await renderHTMLToImage(htmlText, file, canvasSize.width, canvasSize.height);
};
