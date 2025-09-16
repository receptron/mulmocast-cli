import { ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../markdown.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "mermaid";

const processMermaid = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context, textSlideStyle } = params;
  if (!beat?.image || beat.image.type !== imageType) return;

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
  if (!beat.image || beat.image.type !== imageType) return;
  if (beat.image.code.kind !== "text") return; // support only text for now
  return `\`\`\`mermaid\n${beat.image.code.text}\n\`\`\``;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const { MulmoMediaSourceMethods } = await import("../../methods/index.js");
  const diagramCode = await MulmoMediaSourceMethods.getText(beat.image.code, params.context);
  if (!diagramCode) return;

  const title = beat.image.title || "Diagram";
  const appendix = beat.image.appendix?.join("\n") || "";
  const fullCode = `${diagramCode}\n${appendix}`.trim();
  const diagramId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  return `
<div class="mermaid-container mb-6">
  <h3 class="text-xl font-semibold mb-4">${title}</h3>
  <div class="flex justify-center">
    <div id="${diagramId}" class="mermaid">
      ${fullCode}
    </div>
  </div>
</div>`;
};

export const process = processMermaid;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
