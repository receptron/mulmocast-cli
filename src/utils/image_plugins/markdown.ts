import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";
import { type MulmoMarkdownLayout, type MulmoRow2, type MulmoGrid2x2 } from "../../types/type.js";

import { marked } from "marked";
import { isObject } from "graphai";

export const imageType = "markdown";

// Type guard for new layout format
const isMarkdownLayout = (md: unknown): md is MulmoMarkdownLayout => {
  return isObject(md) && !Array.isArray(md);
};

// Convert string or string array to markdown string
const toMarkdownString = (content: string | string[]): string => {
  if (Array.isArray(content)) {
    return content.join("\n");
  }
  return content;
};

// Generate markdown in order: header → sidebar-left → content
const dumpMarkdown = (params: ImageProcessorParams): string | undefined => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const md = beat.image.markdown;

  // Legacy format: string or string[]
  if (!isMarkdownLayout(md)) {
    return toMarkdownString(md);
  }

  // New layout format: object with row-2 or 2x2
  const parts: string[] = [];

  if (md.header) {
    parts.push(toMarkdownString(md.header));
  }
  if (md["sidebar-left"]) {
    parts.push(toMarkdownString(md["sidebar-left"]));
  }
  if ("row-2" in md) {
    parts.push(...md["row-2"].map(toMarkdownString));
  } else if ("2x2" in md) {
    parts.push(...md["2x2"].map(toMarkdownString));
  } else if ("content" in md) {
    parts.push(toMarkdownString(md.content));
  }

  return parts.join("\n\n");
};

// Parse markdown content to HTML
const parseMarkdown = async (content: string | string[]): Promise<string> => {
  const text = toMarkdownString(content);
  return await marked.parse(text);
};

// Generate header HTML
const generateHeaderHtml = async (data: string | string[]): Promise<string> => {
  const headerHtml = await parseMarkdown(data);
  return `
    <div class="shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50">
      <div class="prose prose-lg max-w-none">${headerHtml}</div>
    </div>
  `;
};

// Generate sidebar HTML
const generateSidebarHtml = async (data: string | string[]): Promise<string> => {
  const sidebarHtml = await parseMarkdown(data);
  return `
    <div class="shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto">
      <div class="prose prose-sm max-w-none">${sidebarHtml}</div>
    </div>
  `;
};

// Generate row-2 layout HTML (two columns)
const generateRow2Html = async (data: MulmoRow2): Promise<string> => {
  const [left, right] = data;
  const leftHtml = await parseMarkdown(left);
  const rightHtml = await parseMarkdown(right);
  return `
    <div class="h-full flex gap-6">
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${leftHtml}</div>
      </div>
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${rightHtml}</div>
      </div>
    </div>
  `;
};

// Generate 2x2 grid layout HTML
const generate2x2Html = async (data: MulmoGrid2x2): Promise<string> => {
  const [tl, tr, bl, br] = data;
  const [tlHtml, trHtml, blHtml, brHtml] = await Promise.all([
    parseMarkdown(tl),
    parseMarkdown(tr),
    parseMarkdown(bl),
    parseMarkdown(br),
  ]);
  return `
    <div class="h-full grid grid-cols-2 grid-rows-2 gap-4">
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${tlHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${trHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${blHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${brHtml}</div>
      </div>
    </div>
  `;
};

// Generate content HTML (single column)
const generateContentHtml = async (data: string | string[]): Promise<string> => {
  const contentHtml = await parseMarkdown(data);
  return `<div class="prose max-w-none">${contentHtml}</div>`;
};

// Generate Tailwind HTML for layout
const generateLayoutHtml = async (md: MulmoMarkdownLayout): Promise<string> => {
  const parts: string[] = ['<div class="w-full h-full flex flex-col overflow-hidden">'];

  if (md.header) {
    parts.push(await generateHeaderHtml(md.header));
  }

  parts.push('<div class="flex-1 flex min-h-0 overflow-hidden">');

  if (md["sidebar-left"]) {
    parts.push(await generateSidebarHtml(md["sidebar-left"]));
  }

  parts.push('<div class="flex-1 p-6 overflow-auto">');

  if ("row-2" in md) {
    parts.push(await generateRow2Html(md["row-2"]));
  } else if ("2x2" in md) {
    parts.push(await generate2x2Html(md["2x2"]));
  } else if ("content" in md) {
    parts.push(await generateContentHtml(md.content));
  }

  parts.push("</div>", "</div>", "</div>");

  return parts.join("");
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
