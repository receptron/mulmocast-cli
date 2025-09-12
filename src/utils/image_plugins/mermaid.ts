import { ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../markdown.js";
import { parrotingImagePath, isVaidBeat } from "./utils.js";
import type { MulmoMermaidMedia } from "../../types/index.js";

export const imageType = "mermaid";

const processMermaid = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context, textSlideStyle } = params;
  if (!isVaidBeat<MulmoMermaidMedia>(beat, imageType)) return;

  const template = getHTMLFile("mermaid");
  const diagram_code = await MulmoMediaSourceMethods.getText(beat.image.code, context);
  if (diagram_code) {
    const htmlData = interpolate(template, {
      title: beat.image.title,
      style: textSlideStyle,
      diagram_code: `${diagram_code}\n${beat.image.appendix?.join("\n") ?? ""}`,
    });
    await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height, true);
  }
  return imagePath;
};

const dumpMarkdown = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!isVaidBeat<MulmoMermaidMedia>(beat, imageType)) return;
  if (beat.image.code.kind !== "text") return; // support only text for now
  return `\`\`\`mermaid\n${beat.image.code.text}\n\`\`\``;
};

export const process = processMermaid;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
