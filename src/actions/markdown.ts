import fs from "fs";
import { MulmoStudioContext } from "../types/index.js";
import { localizedText } from "../utils/utils.js";
import { writingMessage } from "../utils/file.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import path from "path";

const generateMarkdownContent = (context: MulmoStudioContext, imageWidth?: string): string => {
  const { studio, multiLingual, lang = "en" } = context;

  const title = studio.script.title || "MulmoCast Content";
  const description = studio.script.description || "";

  let markdown = `# ${title}\n\n`;

  if (description) {
    markdown += `${description}\n\n`;
  }

  studio.script.beats.forEach((beat, index) => {
    const text = localizedText(beat, multiLingual?.[index], lang);
    const studioBeat = studio.beats[index];

    if (text.trim() || studioBeat?.imageFile) {
      if (studioBeat?.imageFile) {
        const imagePath = path.relative(context.fileDirs.outDirPath, studioBeat.imageFile);
        if (imageWidth) {
          // Use HTML img tag for width control
          markdown += `<img src="${imagePath}" alt="Beat ${index + 1}" width="${imageWidth}" />\n\n`;
        } else {
          // Use standard markdown image syntax
          markdown += `![Beat ${index + 1}](${imagePath})\n\n`;
        }
      }

      if (text.trim()) {
        markdown += `${text}\n\n`;
      }
    }
  });

  return markdown;
};

export const markdownFilePath = (context: MulmoStudioContext) => {
  const { studio, fileDirs, lang = "en" } = context;
  const filename = `${studio.filename}${lang !== "en" ? `_${lang}` : ""}.md`;
  return path.join(fileDirs.outDirPath, filename);
};

const generateMarkdown = async (context: MulmoStudioContext, imageWidth?: string): Promise<void> => {
  const outputMarkdownPath = markdownFilePath(context);
  const markdownContent = generateMarkdownContent(context, imageWidth);

  fs.writeFileSync(outputMarkdownPath, markdownContent, "utf8");
  writingMessage(outputMarkdownPath);
};

export const markdown = async (context: MulmoStudioContext, imageWidth?: string): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "markdown", true);
    await generateMarkdown(context, imageWidth);
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "markdown", false);
  }
};
