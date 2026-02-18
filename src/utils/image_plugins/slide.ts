import { ImageProcessorParams } from "../../types/index.js";
import { generateSlideHTML } from "../../slide/index.js";
import type { SlideTheme } from "../../slide/index.js";
import { renderHTMLToImage } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "slide";

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

const processSlide = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  const html = generateSlideHTML(theme, beat.image.slide);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const theme = resolveTheme(params);
  return generateSlideHTML(theme, beat.image.slide);
};

export const process = processSlide;
export const path = parrotingImagePath;
export const html = dumpHtml;
