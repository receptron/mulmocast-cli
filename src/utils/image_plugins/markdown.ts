import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, generateUniqueId } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";
import { type MulmoMarkdownLayout } from "../../types/type.js";
import { renderMarkdownContent, renderMarkdownLayout, layoutToMarkdown, toMarkdownString } from "./markdown_layout.js";
import { resolveImageRefs, resolveMovieRefs } from "./html_tailwind.js";

import { isObject } from "graphai";

/**
 * This path renders once to a PNG, so a random element id is fine. The browser path needs
 * a stable one and supplies its own — that generator is the only thing the two callers of
 * the shared markdown renderer differ on.
 */
const nodeMermaidId = (): string => generateUniqueId("mermaid");

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

/**
 * Full HTML for rendering, and whether it contains a diagram.
 *
 * The two come back together on purpose. There used to be a second detector —
 * `containsMermaid`, a `text.includes("```mermaid")` over the raw source — deciding
 * whether to load the mermaid runtime, while the renderer decided what to draw. Once the
 * renderer started asking marked's lexer, the two disagreed: a ```MERMAID fence drew a
 * diagram that no runtime was loaded for, so the PNG came out with an empty box, and an
 * example quoted inside an outer ````markdown fence loaded the runtime for nothing.
 *
 * One question, one answer. The renderer already knows, so it says.
 */
const generateHtml = async (params: ImageProcessorParams): Promise<{ html: string; hasMermaid: boolean }> => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return { html: "", hasMermaid: false };

  const md = beat.image.markdown;
  const combinedStyle = await resolveCombinedStyle(params, beat.image.backgroundImage, beat.image.style);

  if (isMarkdownLayout(md)) {
    const { html: htmlBody, hasMermaid } = renderMarkdownLayout(md, nodeMermaidId);
    const template = getHTMLFile("tailwind");
    return {
      html: interpolate(template, { title: "Markdown Layout", html_body: htmlBody, custom_style: combinedStyle }),
      hasMermaid,
    };
  }

  const { html: body, hasMermaid } = renderMarkdownContent(dumpMarkdown(params) ?? "", nodeMermaidId);

  // The tailwind template is what loads the mermaid CDN, so a diagram needs it.
  if (hasMermaid) {
    const template = getHTMLFile("tailwind");
    return {
      html: interpolate(template, {
        title: "Markdown",
        html_body: `<div class="prose max-w-none p-6">${body}</div>`,
        custom_style: combinedStyle,
      }),
      hasMermaid,
    };
  }

  return { html: `<html><head><style>${combinedStyle}</style></head><body>${body}</body></html>`, hasMermaid };
};

const processMarkdown = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const { html: rawHtml, hasMermaid } = await generateHtml(params);
  const resolvedImages = resolveImageRefs(rawHtml, params.imageRefs ?? {});
  const html = resolveMovieRefs(resolvedImages, params.movieRefs ?? {});
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height, hasMermaid);

  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return "";

  const md = beat.image.markdown;

  if (isMarkdownLayout(md)) {
    return renderMarkdownLayout(md, nodeMermaidId).html;
  } else {
    return renderMarkdownContent(dumpMarkdown(params) ?? "", nodeMermaidId).html;
  }
};

export const process = processMarkdown;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
