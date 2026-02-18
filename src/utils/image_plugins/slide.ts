import { ImageProcessorParams } from "../../types/index.js";
import { generateSlideHTML } from "../../slide/index.js";
import { renderHTMLToImage } from "../html_render.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "slide";

const processSlide = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = generateSlideHTML(beat.image.theme, beat.image.slide);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  return generateSlideHTML(beat.image.theme, beat.image.slide);
};

export const process = processSlide;
export const path = parrotingImagePath;
export const html = dumpHtml;
