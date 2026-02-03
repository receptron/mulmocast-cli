import { ImageProcessorParams } from "../../types/index.js";
import { renderMarkdownToImage } from "../html_render.js";
import { parrotingImagePath, resolveStyle } from "./utils.js";
import { resolveBackgroundImage, backgroundImageToCSS } from "./bg_image_util.js";

import { marked } from "marked";

export const imageType = "textSlide";

const processTextSlide = async (params: ImageProcessorParams) => {
  const { beat, context, imagePath, textSlideStyle, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const slide = beat.image.slide;
  const style = resolveStyle(beat.image.style, textSlideStyle);

  // Resolve background image (beat level overrides global)
  const globalBackgroundImage = context.studio.script.imageParams?.backgroundImage;
  const beatBackgroundImage = beat.image.backgroundImage;
  const resolvedBackgroundImage = resolveBackgroundImage(beatBackgroundImage, globalBackgroundImage);
  const backgroundCSS = await backgroundImageToCSS(resolvedBackgroundImage, context);

  const combinedStyle = backgroundCSS + style;

  const markdown = dumpMarkdown(params) ?? "";
  const topMargin = (() => {
    if (slide.bullets?.length && slide.bullets.length > 0) {
      return "";
    }
    const marginTop = slide.subtitle ? canvasSize.height * 0.4 : canvasSize.height * 0.45;
    return `body {margin-top: ${marginTop}px;}`;
  })();
  await renderMarkdownToImage(markdown, combinedStyle + topMargin, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpMarkdown = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  const slide = beat.image.slide;
  const titleString = slide.title ? `# ${slide.title}\n` : "";
  const subtitleString = slide.subtitle ? `## ${slide.subtitle}\n` : "";
  const bulletsString = (slide.bullets ?? []).map((text) => `- ${text}`).join("\n");
  return `${titleString}${subtitleString}${bulletsString}`;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const markdown = dumpMarkdown(params);
  return await marked.parse(markdown ?? "");
};

export const process = processTextSlide;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
