import nodePath from "node:path";
import { pathToFileURL } from "node:url";
import { ImageProcessorParams } from "../../types/index.js";
import { generateSlideHTML } from "../../slide/index.js";
import type { SlideLayout, SlideTheme, ContentBlock, MulmoSlideMedia, SlideBranding } from "../../slide/index.js";
import type { ResolvedBranding } from "../../slide/render.js";
import { renderHTMLToImage } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";
import { pathToDataUrl } from "../../methods/mulmo_media_source.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";
import { imageAction, imageFileTarget, unknownMediaType } from "../error_cause.js";

export const imageType = "slide";

const slideImageRefError = (refKey: string) => ({
  type: unknownMediaType,
  action: imageAction,
  target: imageFileTarget,
  agentName: "slidePlugin",
  refKey,
});

/** Convert a file path to a file:// URL string */
const toFileUrl = (filePath: string): string => {
  return pathToFileURL(nodePath.resolve(filePath)).href;
};

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
 * Deep-clone a slide layout and resolve `imageRef` content blocks
 * into `image` blocks using the resolved imageRefs map and a path-to-URL converter.
 * Default converter produces data URLs (for self-contained HTML).
 * Pass `toFileUrl` for Puppeteer rendering (avoids huge inline base64).
 */
export const resolveSlideImageRefs = (
  slide: SlideLayout,
  imageRefs: Record<string, string>,
  converter: (filePath: string) => string = pathToDataUrl,
): SlideLayout => {
  const cloned: SlideLayout = JSON.parse(JSON.stringify(slide));
  const contentArrays = collectContentArrays(cloned);
  contentArrays.forEach((blocks) => {
    blocks.forEach((block, index) => {
      if (block.type !== "imageRef") return;
      const filePath = imageRefs[block.ref];
      if (!filePath) {
        throw new Error(`Unknown image ref key: "${block.ref}"`, { cause: slideImageRefError(block.ref) });
      }
      blocks[index] = {
        type: "image",
        src: converter(filePath),
        ...(block.alt !== undefined && { alt: block.alt }),
        ...(block.fit !== undefined && { fit: block.fit }),
      };
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

const resolveSlide = (params: ImageProcessorParams, converter: (filePath: string) => string = pathToDataUrl): SlideLayout => {
  const { beat, imageRefs } = params;
  if (!beat.image || beat.image.type !== imageType) {
    throw new Error("resolveSlide called on non-slide beat");
  }
  const slide = beat.image.slide;
  if (imageRefs && Object.keys(imageRefs).length > 0) {
    return resolveSlideImageRefs(slide, imageRefs, converter);
  }
  return slide;
};

/**
 * Resolve branding from beat-level and global slideParams.
 * - beat.image.branding === null → disabled (return undefined)
 * - beat.image.branding defined → use it
 * - otherwise → fall back to slideParams.branding
 */
const resolveBranding = (params: ImageProcessorParams): SlideBranding | undefined => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) return undefined;
  const beatBranding = (beat.image as MulmoSlideMedia).branding;
  // null means explicitly disabled
  if (beatBranding === null) return undefined;
  return beatBranding ?? context.presentationStyle.slideParams?.branding;
};

/**
 * Convert SlideBranding to ResolvedBranding (all sources → data URLs).
 */
const convertBrandingToResolved = async (branding: SlideBranding, params: ImageProcessorParams): Promise<ResolvedBranding> => {
  const { context } = params;
  const resolved: ResolvedBranding = {};

  if (branding.logo) {
    const dataUrl = await MulmoMediaSourceMethods.toDataUrl(branding.logo.source, context);
    resolved.logo = {
      dataUrl,
      position: branding.logo.position,
      width: branding.logo.width,
    };
  }

  if (branding.backgroundImage) {
    const dataUrl = await MulmoMediaSourceMethods.toDataUrl(branding.backgroundImage.source, context);
    resolved.backgroundImage = {
      dataUrl,
      size: branding.backgroundImage.size ?? "cover",
      opacity: branding.backgroundImage.opacity ?? 1,
      bgOpacity: branding.backgroundImage.bgOpacity,
    };
  }

  return resolved;
};

const resolveAndConvertBranding = async (params: ImageProcessorParams): Promise<ResolvedBranding | undefined> => {
  const branding = resolveBranding(params);
  return branding ? await convertBrandingToResolved(branding, params) : undefined;
};

const processSlide = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  const slide = resolveSlide(params, toFileUrl);
  const reference = (beat.image as MulmoSlideMedia).reference;
  const resolvedBranding = await resolveAndConvertBranding(params);
  const html = generateSlideHTML(theme, slide, reference, resolvedBranding);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  const slide = resolveSlide(params);
  const reference = (beat.image as MulmoSlideMedia).reference;
  const resolvedBranding = await resolveAndConvertBranding(params);
  return generateSlideHTML(theme, slide, reference, resolvedBranding);
};

export const process = processSlide;
export const path = parrotingImagePath;
export const html = dumpHtml;
