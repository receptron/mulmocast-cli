import fs from "fs";
import { MulmoStudioContext } from "../types/index.js";
import { localizedText } from "../utils/utils.js";
import { writingMessage } from "../utils/file.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import path from "path";

const generateMarkdownContent = (context: MulmoStudioContext): string => {
  const { studio, multiLingual, lang = "en" } = context;
  
  const title = studio.script.title || "MulmoCast Content";
  const description = studio.script.description || "";
  
  let markdown = `# ${title}\n\n`;
  
  if (description) {
    markdown += `${description}\n\n`;
  }
  
  studio.script.beats.forEach((beat, index) => {
    const text = localizedText(beat, multiLingual?.[index], lang);
    if (text.trim()) {
      markdown += `${text}\n\n`;
    }
  });
  
  return markdown;
};

export const markdownFilePath = (context: MulmoStudioContext) => {
  const { studio, fileDirs, lang = "en" } = context;
  const filename = `${studio.filename}${lang !== "en" ? `_${lang}` : ""}.md`;
  return path.join(fileDirs.outDirPath, filename);
};

const generateMarkdown = async (context: MulmoStudioContext): Promise<void> => {
  const outputMarkdownPath = markdownFilePath(context);
  const markdownContent = generateMarkdownContent(context);
  
  fs.writeFileSync(outputMarkdownPath, markdownContent, "utf8");
  writingMessage(outputMarkdownPath);
};

export const markdown = async (context: MulmoStudioContext): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "markdown", true);
    await generateMarkdown(context);
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "markdown", false);
  }
};