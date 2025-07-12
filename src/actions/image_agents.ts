import { MulmoStudioContext, MulmoBeat, MulmoCanvasDimension } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods, MulmoBeatMethods } from "../methods/index.js";
import { getBeatPngImagePath, getBeatMoviePath } from "../utils/file.js";
import { imagePrompt, htmlImageSystemPrompt } from "../utils/prompt.js";
import { renderHTMLToImage } from "../utils/markdown.js";
import { GraphAILogger } from "graphai";

const htmlStyle = (context: MulmoStudioContext, beat: MulmoBeat) => {
  return {
    canvasSize: MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle),
    textSlideStyle: MulmoPresentationStyleMethods.getTextSlideStyle(context.presentationStyle, beat),
  };
};

export const imagePreprocessAgent = async (namedInputs: { context: MulmoStudioContext; beat: MulmoBeat; index: number; imageRefs: Record<string, string> }) => {
  const { context, beat, index, imageRefs } = namedInputs;

  const imagePath = getBeatPngImagePath(context, index);
  if (beat.htmlPrompt) {
    const htmlPrompt = MulmoBeatMethods.getHtmlPrompt(beat);
    const htmlPath = imagePath.replace(/\.[^/.]+$/, ".html");
    return { imagePath, htmlPrompt, htmlPath, htmlImageSystemPrompt: htmlImageSystemPrompt(context.presentationStyle.canvasSize) };
  }

  const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(context.presentationStyle, beat);
  const returnValue = {
    imageParams: imageAgentInfo.imageParams,
    movieFile: beat.moviePrompt ? getBeatMoviePath(context, index) : undefined,
  };

  if (beat.image) {
    const plugin = MulmoBeatMethods.getPlugin(beat);
    const pluginPath = plugin.path({ beat, context, imagePath, ...htmlStyle(context, beat) });
    // undefined prompt indicates that image generation is not needed
    return { ...returnValue, imagePath: pluginPath, referenceImageForMovie: pluginPath };
  }

  const movieParams = { ...context.presentationStyle.movieParams, ...beat.movieParams };
  GraphAILogger.log(`movieParams: ${index}`, movieParams, beat.moviePrompt);
  if (beat.moviePrompt && !beat.imagePrompt) {
    return { ...returnValue, imagePath, imageFromMovie: true, movieParams }; // no image prompt, only movie prompt
  }

  // referenceImages for "edit_image", openai agent.
  const referenceImages = MulmoBeatMethods.getImageReferenceForImageGenerator(beat, imageRefs);

  const prompt = imagePrompt(beat, imageAgentInfo.imageParams.style);
  return { ...returnValue, imagePath, referenceImageForMovie: imagePath, imageAgentInfo, prompt, referenceImages, movieParams, moviePrompt: beat.moviePrompt };
};

export const imagePluginAgent = async (namedInputs: { context: MulmoStudioContext; beat: MulmoBeat; index: number }) => {
  const { context, beat, index } = namedInputs;
  const imagePath = getBeatPngImagePath(context, index);

  const plugin = MulmoBeatMethods.getPlugin(beat);
  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, true);
    const processorParams = { beat, context, imagePath, ...htmlStyle(context, beat) };
    await plugin.process(processorParams);
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, false);
  } catch (error) {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, false);
    throw error;
  }
};

export const htmlImageGeneratorAgent = async (namedInputs: { file: string; canvasSize: MulmoCanvasDimension; htmlText: string }) => {
  const { file, canvasSize, htmlText } = namedInputs;
  await renderHTMLToImage(htmlText, file, canvasSize.width, canvasSize.height);
};
