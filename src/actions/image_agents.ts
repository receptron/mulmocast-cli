import { GraphAILogger } from "graphai";
import { MulmoStudioContext, MulmoBeat, MulmoCanvasDimension, MulmoImageParams, MulmoMovieParams, Text2ImageAgentInfo } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods, MulmoBeatMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import { getBeatPngImagePath, getBeatMoviePaths, getAudioFilePath, getGroupedAudioFilePath } from "../utils/file.js";
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
};

type ImagePluginPreprocessAgentResponse = ImagePreprocessAgentResponseBase & {
  referenceImageForMovie: string;
  markdown: string;
  html: string;
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

  if (beat.image) {
    const plugin = MulmoBeatMethods.getPlugin(beat);
    const pluginPath = plugin.path({ beat, context, imagePath, ...htmlStyle(context, beat) });

    const markdown = plugin.markdown ? plugin.markdown({ beat, context, imagePath, ...htmlStyle(context, beat) }) : undefined;
    const html = plugin.html ? await plugin.html({ beat, context, imagePath, ...htmlStyle(context, beat) }) : undefined;

    const isTypeMovie = beat.image.type === "movie";
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
    return { ...returnValue, imagePath, imageFromMovie: true }; // no image prompt, only movie prompt
  }

  // referenceImages for "edit_image", openai agent.
  const referenceImages = MulmoBeatMethods.getImageReferenceForImageGenerator(beat, imageRefs ?? {});

  const prompt = imagePrompt(beat, imageAgentInfo.imageParams.style);
  // ImageGenearalPreprocessAgentResponse
  return { ...returnValue, imagePath, referenceImageForMovie: imagePath, imageAgentInfo, prompt, referenceImages };
};

export const imagePluginAgent = async (namedInputs: { context: MulmoStudioContext; beat: MulmoBeat; index: number; imageRefs?: Record<string, string> }) => {
  const { context, beat, index, imageRefs } = namedInputs;
  const { imagePath } = getBeatPngImagePath(context, index);

  const plugin = MulmoBeatMethods.getPlugin(beat);
  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, true);
    const processorParams = { beat, context, imagePath, imageRefs, ...htmlStyle(context, beat) };
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
