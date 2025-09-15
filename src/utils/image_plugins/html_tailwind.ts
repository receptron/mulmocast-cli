import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../markdown.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "html_tailwind";

const processHtmlTailwind = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;

  const template = getHTMLFile("tailwind");
  const htmlData = interpolate(template, {
    // style: textSlideStyle,
    // width: Math.round(canvasSize.width * 0.625).toString(),
    html_body: html,
  });
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  return Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
