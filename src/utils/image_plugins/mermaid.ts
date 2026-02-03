import { ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, generateUniqueId } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";

export const imageType = "mermaid";

// Generate mermaid HTML from code string (shared utility)
export const generateMermaidHtml = (code: string, title?: string): string => {
  const diagramId = generateUniqueId("mermaid");
  const titleHtml = title ? `<h3 class="text-xl font-semibold mb-4">${title}</h3>` : "";
  return `
<div class="mermaid-container mb-6">
  ${titleHtml}
  <div class="flex justify-center">
    <div id="${diagramId}" class="mermaid">
      ${code.trim()}
    </div>
  </div>
</div>`;
};

const processMermaid = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat?.image || beat.image.type !== imageType) return;

  const template = getHTMLFile("mermaid");
  const diagram_code = await MulmoMediaSourceMethods.getText(beat.image.code, context);
  if (diagram_code) {
    const combinedStyle = await resolveCombinedStyle(params, beat.image.backgroundImage, beat.image.style);
    const htmlData = interpolate(template, {
      title: beat.image.title,
      style: combinedStyle,
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

  const diagramCode = await MulmoMediaSourceMethods.getText(beat.image.code, params.context);
  if (!diagramCode) return;

  const title = beat.image.title || "Diagram";
  const appendix = beat.image.appendix?.join("\n") || "";
  const fullCode = `${diagramCode}\n${appendix}`.trim();

  return generateMermaidHtml(fullCode, title);
};

export const process = processMermaid;
export const path = parrotingImagePath;
export const markdown = dumpMarkdown;
export const html = dumpHtml;
