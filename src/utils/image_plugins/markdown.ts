import { ImageProcessorParams } from "../../types/index.js";
import { renderMarkdownToImage } from "../markdown.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "markdown";

const processMarkdown = async (params: ImageProcessorParams) => {
  const { beat, imagePath, textSlideStyle, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const markdown = dumpMarkdown(params) ?? "";
  await renderMarkdownToImage(markdown, textSlideStyle, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpMarkdown = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  return Array.isArray(beat.image.markdown) ? beat.image.markdown.join("\n") : beat.image.markdown;
};

export const process = processMarkdown;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
