import fs from "fs";
import path from "path";
import { isNull } from "graphai";
import { MulmoStudioContext } from "../types/index.js";
import { localizedText } from "../utils/utils.js";
import { writingMessage } from "../utils/file.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

const generateHtmlContent = (context: MulmoStudioContext, imageWidth?: string): string => {
  const { studio, multiLingual, lang = "en" } = context;

  const title = studio.script.title || "MulmoCast Content";
  const description = studio.script.description || "";

  let html = "";

  if (description) {
    html += `${description}\n\n`;
  }

  studio.script.beats.forEach((beat, index) => {
    const text = localizedText(beat, multiLingual?.[index], lang);
    const studioBeat = studio.beats[index];

    if (text.trim() || studioBeat?.html || studioBeat?.imageFile) {
      if (studioBeat?.html) {
        html += `${studioBeat.html}\n\n`;
      } else if (studioBeat?.imageFile && isNull(studioBeat.html)) {
        const imagePath = path.relative(context.fileDirs.outDirPath, studioBeat.imageFile);
        const altText = `Beat ${index + 1}`;
        if (imageWidth) {
          // Use HTML img tag for width control
          html += `<img src="${imagePath}" alt="${altText}" width="${imageWidth}" />\n\n`;
        } else {
          // Use standard html image syntax
          html += `<img src="${imagePath}" alt="${altText}" />\n\n`;
        }
      }

      if (text.trim()) {
        html += `${text}\n\n`;
      }
    }
  });

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Mermaid CDN -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  </head>
  <body class="min-h-screen flex flex-col">
${html}
    <!-- Initialize Mermaid -->
    <script>
      mermaid.initialize({ startOnLoad: true });
    </script>
  </body>
</html>
`;
};

export const htmlFilePath = (context: MulmoStudioContext) => {
  const { studio, fileDirs, lang = "en" } = context;
  // Add language suffix only when target language is different from script's original language
  const langSuffix = studio.script.lang !== lang ? `_${lang}` : "";
  const filename = `${studio.filename}${langSuffix}.html`;
  return path.join(fileDirs.outDirPath, filename);
};

const generateHtml = async (context: MulmoStudioContext, imageWidth?: string): Promise<void> => {
  const outputHtmlPath = htmlFilePath(context);
  const htmlContent = generateHtmlContent(context, imageWidth);

  fs.writeFileSync(outputHtmlPath, htmlContent, "utf8");
  writingMessage(outputHtmlPath);
};

export const html = async (context: MulmoStudioContext, imageWidth?: string): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "html", true);
    await generateHtml(context, imageWidth);
    MulmoStudioContextMethods.setSessionState(context, "html", false, true);
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "html", false, false);
  }
};
