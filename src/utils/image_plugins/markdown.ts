import { ImageProcessorParams } from "../../types/index.js";
import { renderMarkdownToImage } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";

import { marked } from "marked";

export const imageType = "markdown";

const processMarkdown = async (params: ImageProcessorParams) => {
  const { beat, imagePath, textSlideStyle, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const markdown = dumpMarkdown(params) ?? "";

  // Use custom style if specified, otherwise use default textSlideStyle
  const styleName = beat.image.style;
  const customStyle = styleName ? getMarkdownStyle(styleName) : undefined;
  const style = customStyle ? customStyle.css : textSlideStyle;

  await renderMarkdownToImage(markdown, style, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpMarkdown = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  return Array.isArray(beat.image.markdown) ? beat.image.markdown.join("\n") : beat.image.markdown;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const markdown = dumpMarkdown(params);
  return await marked.parse(markdown ?? "");
};

export const process = processMarkdown;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
