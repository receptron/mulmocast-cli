import { ImageProcessorParams } from "../../types/index.js";
import { renderMarkdownToImage } from "../markdown.js";
import { parrotingImagePath, isVaidBeat } from "./utils.js";
import type { MulmoTextSlideMedia } from "../../types/index.js";

export const imageType = "textSlide";

const processTextSlide = async (params: ImageProcessorParams) => {
  const { beat, imagePath, textSlideStyle, canvasSize } = params;
  if (!isVaidBeat<MulmoTextSlideMedia>(beat, imageType)) return;

  const markdown = dumpMarkdown(params) ?? "";
  const topMargin = (() => {
    const slide = beat.image.slide;
    if (slide.bullets?.length && slide.bullets.length > 0) {
      return "";
    }
    const marginTop = slide.subtitle ? canvasSize.height * 0.4 : canvasSize.height * 0.45;
    return `body {margin-top: ${marginTop}px;}`;
  })();
  await renderMarkdownToImage(markdown, textSlideStyle + topMargin, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpMarkdown = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!isVaidBeat<MulmoTextSlideMedia>(beat, imageType)) return;
  const slide = beat.image.slide;
  const titleString = slide.title ? `# ${slide.title}\n` : "";
  const subtitleString = slide.subtitle ? `## ${slide.subtitle}\n` : "";
  const bulletsString = (slide.bullets ?? []).map((text) => `- ${text}`).join("\n");
  return `${titleString}${subtitleString}${bulletsString}`;
};

export const process = processTextSlide;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
