import { ImageProcessorParams } from "../../types/index.js";
import { generateSlideHTML } from "../../slide/index.js";
import type { SlideLayout, SlideTheme, ContentBlock } from "../../slide/index.js";
import { renderHTMLToImage } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { pathToDataUrl } from "../../methods/mulmo_media_source.js";

export const imageType = "slide";

const REF_PREFIX = "ref:";

/**
 * Collect all content block arrays from a slide layout.
 * Only layouts that embed ContentBlock[] are handled:
 *   columns, comparison, grid, split, matrix
 */
export const collectContentArrays = (slide: SlideLayout): ContentBlock[][] => {
  const result: ContentBlock[][] = [];
  switch (slide.layout) {
    case "columns":
      slide.columns.forEach((col) => {
        if (col.content) result.push(col.content);
      });
      break;
    case "comparison":
      if (slide.left.content) result.push(slide.left.content);
      if (slide.right.content) result.push(slide.right.content);
      break;
    case "grid":
      slide.items.forEach((item) => {
        if (item.content) result.push(item.content);
      });
      break;
    case "split":
      if (slide.left?.content) result.push(slide.left.content);
      if (slide.right?.content) result.push(slide.right.content);
      break;
    case "matrix":
      slide.cells.forEach((cell) => {
        if (cell.content) result.push(cell.content);
      });
      break;
    default:
      // title, bigQuote, stats, timeline, table, funnel — no content blocks
      break;
  }
  return result;
};

/**
 * Deep-clone a slide layout and resolve `ref:<key>` image sources
 * to data URLs using the resolved imageRefs map.
 */
export const resolveSlideImageRefs = (slide: SlideLayout, imageRefs: Record<string, string>): SlideLayout => {
  const cloned: SlideLayout = JSON.parse(JSON.stringify(slide));
  const contentArrays = collectContentArrays(cloned);
  contentArrays.forEach((blocks) => {
    blocks.forEach((block) => {
      if (block.type !== "image") return;
      if (!block.src.startsWith(REF_PREFIX)) return;
      const key = block.src.slice(REF_PREFIX.length);
      const filePath = imageRefs[key];
      if (!filePath) {
        throw new Error(`Unknown image ref key: "${key}"`);
      }
      block.src = pathToDataUrl(filePath);
    });
  });
  return cloned;
};

const resolveTheme = (params: ImageProcessorParams): SlideTheme => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) {
    throw new Error("resolveTheme called on non-slide beat");
  }
  const defaultTheme = context.presentationStyle.slideParams?.theme;
  const theme = beat.image.theme ?? defaultTheme;
  if (!theme) {
    throw new Error("Slide theme is required: set slideParams.theme or beat.image.theme");
  }
  return theme;
};

const resolveSlide = (params: ImageProcessorParams): SlideLayout => {
  const { beat, imageRefs } = params;
  if (!beat.image || beat.image.type !== imageType) {
    throw new Error("resolveSlide called on non-slide beat");
  }
  const slide = beat.image.slide;
  if (imageRefs && Object.keys(imageRefs).length > 0) {
    return resolveSlideImageRefs(slide, imageRefs);
  }
  return slide;
};

const processSlide = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  const slide = resolveSlide(params);
  const html = generateSlideHTML(theme, slide);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  const slide = resolveSlide(params);
  return generateSlideHTML(theme, slide);
};

export const process = processSlide;
export const path = parrotingImagePath;
export const html = dumpHtml;
