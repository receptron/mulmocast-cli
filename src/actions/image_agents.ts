import { MulmoStudioContext, MulmoBeat, MulmoCanvasDimension, MulmoImageParams, MulmoMovieParams } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods, MulmoBeatMethods, MulmoMediaSourceMethods } from "../methods/index.js";
import { getBeatPngImagePath, getBeatMoviePaths, getAudioFilePath } from "../utils/file.js";
import { imagePrompt, htmlImageSystemPrompt } from "../utils/prompt.js";
import { renderHTMLToImage } from "../utils/markdown.js";
import { beatId } from "../utils/utils.js";

const htmlStyle = (context: MulmoStudioContext, beat: MulmoBeat) => {
  return {
    canvasSize: MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle),
    textSlideStyle: MulmoPresentationStyleMethods.getTextSlideStyle(context.presentationStyle, beat),
  };
};

export const imagePreprocessAgent = async (namedInputs: { context: MulmoStudioContext; beat: MulmoBeat; index: number; imageRefs: Record<string, string> }) => {
  const { context, beat, index, imageRefs } = namedInputs;

  const studioBeat = context.studio.beats[index];
  const { imagePath, htmlImageFile } = getBeatPngImagePath(context, index);
  if (beat.htmlPrompt) {
    const htmlPrompt = MulmoBeatMethods.getHtmlPrompt(beat);
    const htmlPath = imagePath.replace(/\.[^/.]+$/, ".html");
    return { imagePath, htmlPrompt, htmlImageFile, htmlPath, htmlImageSystemPrompt: htmlImageSystemPrompt(context.presentationStyle.canvasSize) };
  }

  const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(context.presentationStyle, beat);
  const moviePaths = getBeatMoviePaths(context, index);
  const returnValue: {
    imageParams: MulmoImageParams;
    movieFile: string | undefined;
    soundEffectFile?: string;
    soundEffectPrompt?: string;
    soundEffectModel?: string;
    soundEffectAgentInfo?: { agentName: string; defaultModel: string };
    lipSyncFile?: string;
    lipSyncModel?: string;
    lipSyncAgentName?: string;
    lipSyncTrimAudio?: boolean; // instruction to trim audio from the BGM
    bgmFile?: string | null;
    startAt?: number;
    duration?: number;
    audioFile?: string;
    beatDuration?: number;
    movieAgentInfo?: { agent: string; movieParams: MulmoMovieParams };
    markdown?: string;
    html?: string;
  } = {
    imageParams: imageAgentInfo.imageParams,
    movieFile: beat.moviePrompt ? moviePaths.movieFile : undefined,
    beatDuration: beat.duration ?? studioBeat?.duration,
  };

  const isMovie = Boolean(beat.moviePrompt || beat?.image?.type === "movie");
  if (isMovie) {
    if (beat.soundEffectPrompt) {
      returnValue.soundEffectAgentInfo = MulmoPresentationStyleMethods.getSoundEffectAgentInfo(context.presentationStyle, beat);
      returnValue.soundEffectModel =
        beat.soundEffectParams?.model ?? context.presentationStyle.soundEffectParams?.model ?? returnValue.soundEffectAgentInfo.defaultModel;
      returnValue.soundEffectFile = moviePaths.soundEffectFile;
      returnValue.soundEffectPrompt = beat.soundEffectPrompt;
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
      const fileName = `${beatId(beat.id, index)}_trimmed.mp3`;
      returnValue.audioFile = getAudioFilePath(audioDirPath, folderName, fileName);
    } else {
      // Audio file will be set from the beat's audio file when available
      returnValue.audioFile = studioBeat?.audioFile;
    }
  }

  returnValue.movieAgentInfo = MulmoPresentationStyleMethods.getMovieAgentInfo(context.presentationStyle, beat);

  if (beat.image) {
    const plugin = MulmoBeatMethods.getPlugin(beat);
    const pluginPath = plugin.path({ beat, context, imagePath, ...htmlStyle(context, beat) });
    if (plugin.markdown) {
      returnValue.markdown = plugin.markdown({ beat, context, imagePath, ...htmlStyle(context, beat) });
    }
    if (plugin.html) {
      returnValue.html = plugin.html({ beat, context, imagePath, ...htmlStyle(context, beat) });
    }

    const isTypeMovie = beat.image.type === "movie";
    // undefined prompt indicates that image generation is not needed
    return { ...returnValue, imagePath: isTypeMovie ? undefined : pluginPath, movieFile: isTypeMovie ? pluginPath : undefined, referenceImageForMovie: pluginPath };
  }

  if (beat.moviePrompt && !beat.imagePrompt) {
    return { ...returnValue, imagePath, imageFromMovie: true }; // no image prompt, only movie prompt
  }

  // referenceImages for "edit_image", openai agent.
  const referenceImages = MulmoBeatMethods.getImageReferenceForImageGenerator(beat, imageRefs);

  const prompt = imagePrompt(beat, imageAgentInfo.imageParams.style);
  return { ...returnValue, imagePath, referenceImageForMovie: imagePath, imageAgentInfo, prompt, referenceImages };
};

export const imagePluginAgent = async (namedInputs: { context: MulmoStudioContext; beat: MulmoBeat; index: number }) => {
  const { context, beat, index } = namedInputs;
  const { imagePath } = getBeatPngImagePath(context, index);

  const plugin = MulmoBeatMethods.getPlugin(beat);
  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, true);
    const processorParams = { beat, context, imagePath, ...htmlStyle(context, beat) };
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
