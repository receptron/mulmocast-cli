import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";
import { type MulmoMarkdownLayout } from "../../types/type.js";
import { generateLayoutHtml, layoutToMarkdown, toMarkdownString, parseMarkdown } from "./markdown_layout.js";

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
  const combinedStyle = await resolveCombinedStyle(params, beat.image.backgroundImage, beat.image.style);

  if (isMarkdownLayout(md)) {
    const htmlBody = await generateLayoutHtml(md);
    const template = getHTMLFile("tailwind");
    return interpolate(template, {
      title: "Markdown Layout",
      html_body: htmlBody,
      custom_style: combinedStyle,
    });
  }

  const markdown = dumpMarkdown(params) ?? "";
  const body = await parseMarkdown(markdown);

  // Use tailwind template if mermaid is present to ensure mermaid CDN is loaded
  if (containsMermaid(md)) {
    const template = getHTMLFile("tailwind");
    return interpolate(template, {
      title: "Markdown",
      html_body: `<div class="prose max-w-none p-6">${body}</div>`,
      custom_style: combinedStyle,
    });
  }

  return `<html><head><style>${combinedStyle}</style></head><body>${body}</body></html>`;
};

// Check if markdown content contains mermaid code blocks
const containsMermaid = (md: string | string[] | MulmoMarkdownLayout): boolean => {
  const text = isMarkdownLayout(md) ? layoutToMarkdown(md) : toMarkdownString(md);
  return text.includes("```mermaid");
};

const processMarkdown = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = await generateHtml(params);
  const hasMermaid = containsMermaid(beat.image.markdown);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height, hasMermaid);

  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return "";

  const md = beat.image.markdown;

  if (isMarkdownLayout(md)) {
    return await generateLayoutHtml(md);
  } else {
    const markdown = dumpMarkdown(params);
    return await parseMarkdown(markdown ?? "");
  }
};

export const process = processMarkdown;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
