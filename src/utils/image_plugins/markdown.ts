import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";
import { type MulmoMarkdownLayout } from "../../types/type.js";
import { generateLayoutHtml, layoutToMarkdown, toMarkdownString } from "./markdown_layout.js";

import { marked } from "marked";
import { isObject } from "graphai";

export const imageType = "markdown";

// Type guard for object (data) format
const isMarkdownLayout = (md: unknown): md is MulmoMarkdownLayout => {
  return isObject(md) && !Array.isArray(md);
};

// Generate markdown in order: header → sidebar-left → content
const dumpMarkdown = (params: ImageProcessorParams): string | undefined => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const md = beat.image.markdown;

  // text | text[] format
  if (!isMarkdownLayout(md)) {
    return toMarkdownString(md);
  }

  // object (data) format
  return layoutToMarkdown(md);
};

// Generate full HTML for rendering
const generateHtml = async (params: ImageProcessorParams): Promise<string> => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return "";

  const md = beat.image.markdown;
  const styleName = beat.image.style;
  const customStyle = styleName ? getMarkdownStyle(styleName) : undefined;
  const style = customStyle ? customStyle.css : params.textSlideStyle;

  if (isMarkdownLayout(md)) {
    const htmlBody = await generateLayoutHtml(md);
    const template = getHTMLFile("tailwind");
    return interpolate(template, {
      title: "Markdown Layout",
      html_body: htmlBody,
      custom_style: style,
    });
  }

  const markdown = dumpMarkdown(params) ?? "";
  const body = await marked.parse(markdown);
  return `<html><head><style>${style}</style></head><body>${body}</body></html>`;
};

const processMarkdown = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = await generateHtml(params);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);

  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const md = beat.image.markdown;

  if (isMarkdownLayout(md)) {
    return await generateLayoutHtml(md);
  } else {
    const markdown = dumpMarkdown(params);
    return await marked.parse(markdown ?? "");
  }
};

export const process = processMarkdown;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
