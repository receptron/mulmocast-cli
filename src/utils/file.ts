import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { parse as yamlParse } from "yaml";
import { fileURLToPath } from "url";
import { GraphAILogger } from "graphai";
import type { MulmoScript, MulmoPromptTemplateFile, MulmoPromptTemplate, MulmoStudioContext } from "../types/index.js";
import { MulmoStudioContextMethods } from "../methods/index.js";
import { mulmoPromptTemplateSchema } from "../types/schema.js";
import { PDFMode } from "../types/index.js";
import { z, ZodSchema, ZodType } from "zod";
import { getMulmoScriptTemplateSystemPrompt } from "./prompt.js";
import { resolveAssetFile } from "./asset_import.js";

const promptTemplateDirName = "./assets/templates";
const scriptTemplateDirName = "./scripts/templates";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let npmRoot = path.resolve(__dirname, "../../");

export const updateNpmRoot = (_npmRoot: string) => {
  npmRoot = _npmRoot;
};

export function readMulmoScriptFile<T = MulmoScript>(
  path: string,
  errorMessage: string,
): {
  mulmoData: T;
  mulmoDataPath: string;
  fileName: string;
};

export function readMulmoScriptFile<T = MulmoScript>(
  path: string,
): {
  mulmoData: T;
  mulmoDataPath: string;
  fileName: string;
} | null;

export function readMulmoScriptFile<T = MulmoScript>(
  arg2: string,
  errorMessage?: string,
): {
  mulmoData: T;
  mulmoDataPath: string;
  fileName: string;
} | null {
  const scriptPath = path.resolve(arg2);
  if (!isFile(scriptPath)) {
    if (errorMessage) {
      GraphAILogger.info(errorMessage);
    }
    return null;
  }
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  try {
    const script = ([".yaml", ".yml"].includes(path.extname(scriptPath).toLowerCase()) ? yamlParse(scriptData) : JSON.parse(scriptData)) as T;
    const parsedPath = path.parse(scriptPath);

    return {
      mulmoData: script,
      mulmoDataPath: scriptPath,
      fileName: parsedPath.name,
    };
  } catch (error) {
    if (errorMessage) {
      GraphAILogger.info("read file format is broken.", error);
    }
    return null;
  }
}
export const fetchMulmoScriptFile = async (url: string): Promise<{ result: boolean; script?: MulmoScript; status: string | number }> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { result: false, status: res.status };
    }
    const script = (await res.json()) as MulmoScript;
    return {
      result: true,
      script,
      status: 200,
    };
  } catch {
    return { result: false, status: "unknown" };
  }
};

export const getOutputStudioFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + "_studio.json");
};
export const getOutputMultilingualFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + "_lang.json");
};
export const resolveDirPath = (dirPath: string, studioFileName: string) => {
  return path.resolve(dirPath, studioFileName);
};
// audio
export const getAudioFilePath = (audioDirPath: string, dirName: string, fileName: string, lang?: string) => {
  if (lang) {
    return path.resolve(audioDirPath, dirName, `${fileName}_${lang}.mp3`);
  }
  return path.resolve(audioDirPath, dirName, fileName + ".mp3");
};

export const getAudioArtifactFilePath = (context: MulmoStudioContext) => {
  const suffix = context.lang ? `_${context.lang}` : "";
  const fileName = MulmoStudioContextMethods.getFileName(context);
  const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
  return path.resolve(outDirPath, fileName + suffix + ".mp3");
};

export const getOutputVideoFilePath = (outDirPath: string, fileName: string, lang?: string, caption?: string) => {
  const suffix = lang ? `_${lang}` : "";
  const suffix2 = caption ? `__${caption}` : "";
  return path.resolve(outDirPath, `${fileName}${suffix}${suffix2}.mp4`);
};
// image
export const imageSuffix = "p";

export const getBeatPngImagePath = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const beat = context.studio.script.beats[index]; // beat could be undefined only in a test case.
  const filename = beat?.id ? `${beat.id}` : `${index}${imageSuffix}`;
  const imagePath = `${imageProjectDirPath}/${filename}.png`;
  const htmlImageFile = `${imageProjectDirPath}/${filename}_html.png`;
  return { imagePath, htmlImageFile };
};

export const getBeatAnimatedVideoPath = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const beat = context.studio.script.beats[index];
  const filename = beat?.id ? `${beat.id}` : `${index}${imageSuffix}`;
  return `${imageProjectDirPath}/${filename}_animated.mp4`;
};

export const getBeatMoviePaths = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const beat = context.studio.script.beats[index]; // beat could be undefined only in a test case.
  const filename = beat?.id ? `${beat.id}` : `${index}`;
  return {
    movieFile: `${imageProjectDirPath}/${filename}.mov`,
    soundEffectFile: `${imageProjectDirPath}/${filename}_sound.mov`,
    lipSyncFile: `${imageProjectDirPath}/${filename}_lipsync.mov`,
  };
};

export const getReferenceImagePath = (context: MulmoStudioContext, key: string, extension: string) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  return `${imageProjectDirPath}/${key}.${extension}`;
};
export const getCaptionImagePath = (context: MulmoStudioContext, index: number, subIndex?: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  if (subIndex !== undefined) {
    return `${imageProjectDirPath}/${index}_caption_${subIndex}.png`;
  }
  return `${imageProjectDirPath}/${index}_caption.png`;
};

// pdf
export const getOutputPdfFilePath = (outDirPath: string, fileName: string, pdfMode: PDFMode, lang?: string) => {
  if (lang) {
    return path.resolve(outDirPath, `${fileName}_${pdfMode}_${lang}.pdf`);
  }
  return path.resolve(outDirPath, `${fileName}_${pdfMode}.pdf`);
};

export const getPromptTemplateFilePath = (promptTemplateName: string) => {
  return resolveAssetFile(path.join(promptTemplateDirName, promptTemplateName + ".json"), npmRoot);
};

export const mkdir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    GraphAILogger.info("mkdir: " + dirPath);
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// asset path
export const resolveAssetPath = (context: MulmoStudioContext, relativePath: string): string => {
  return path.resolve(context.fileDirs.mulmoFileDirPath, relativePath);
};

// export const silentPath = path.resolve(npmRoot, "./assets/audio/silent300.mp3");
// export const silentLastPath = path.resolve(npmRoot, "./assets/audio/silent800.mp3");
export const silent60secPath = () => resolveAssetFile("./assets/audio/silent60sec.mp3", npmRoot);
export const defaultBGMPath = () => "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3";
export const mulmoCreditPath = () => resolveAssetFile("./assets/images/mulmocast_credit.png", npmRoot);
export const blankImagePath = () => resolveAssetFile("./assets/images/blank.png", npmRoot);
export const blankVerticalImagePath = () => resolveAssetFile("./assets/images/blank_v.png", npmRoot);
export const blankSquareImagePath = () => resolveAssetFile("./assets/images/blank_sq.png", npmRoot);

export const getHTMLFile = (filename: string) => {
  const htmlPath = resolveAssetFile(`./assets/html/${filename}.html`, npmRoot);
  return fs.readFileSync(htmlPath, "utf-8");
};

// for cli
export const getBaseDirPath = (basedir?: string) => {
  if (!basedir) {
    return process.cwd();
  }
  if (path.isAbsolute(basedir)) {
    return path.normalize(basedir);
  }
  return path.resolve(process.cwd(), basedir);
};

export const getFullPath = (baseDirPath: string | undefined, file: string) => {
  if (path.isAbsolute(file)) {
    return path.normalize(file);
  }
  if (baseDirPath) {
    return path.resolve(baseDirPath, file);
  }
  return path.resolve(file);
};

// script and prompt template
export const readScriptTemplateFile = (scriptTemplateFileName: string): MulmoScript => {
  const scriptTemplatePath = resolveAssetFile(path.join(scriptTemplateDirName, scriptTemplateFileName), npmRoot);
  const scriptTemplateData = fs.readFileSync(scriptTemplatePath, "utf-8");
  // NOTE: We don't want to schema parse the script here to eliminate default values.
  return JSON.parse(scriptTemplateData);
};

const readPromptTemplateFile = (promptTemplateFileName: string): MulmoPromptTemplateFile => {
  const promptTemplatePath = getPromptTemplateFilePath(promptTemplateFileName);
  const promptTemplateData = fs.readFileSync(promptTemplatePath, "utf-8");
  // NOTE: We don't want to schema parse the template here to eliminate default values.
  return JSON.parse(promptTemplateData);
};

const mulmoScriptTemplate2Script = (scriptTemplate: MulmoPromptTemplate): MulmoScript | undefined => {
  if (scriptTemplate.scriptName) {
    const scriptTemplateData = readScriptTemplateFile(scriptTemplate.scriptName);
    return { ...scriptTemplateData, ...(scriptTemplate.presentationStyle ?? {}) };
  }
  return undefined;
};
export const getScriptFromPromptTemplate = (promptTemplateFileName: string): MulmoScript | undefined => {
  const promptTemplate = readPromptTemplateFile(promptTemplateFileName);
  return mulmoScriptTemplate2Script(promptTemplate);
};

export const readTemplatePrompt = (promptTemplateFileName: string): string => {
  const promptTemplate = readPromptTemplateFile(promptTemplateFileName);
  const script = mulmoScriptTemplate2Script(promptTemplate);
  const prompt = getMulmoScriptTemplateSystemPrompt(promptTemplate, script);
  return prompt;
};

const getPromptTemplates = <T>(dirPath: string, schema: ZodType | null): T[] => {
  const templatesDir = path.resolve(npmRoot, dirPath);

  if (!fs.existsSync(templatesDir)) {
    return [];
  }

  const files = fs.readdirSync(templatesDir);
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      try {
        const promptTemplate = JSON.parse(fs.readFileSync(path.resolve(templatesDir, file), "utf-8"));
        return {
          ...(schema ? schema.parse(promptTemplate) : promptTemplate),
          filename: file.replace(/\.json$/, ""),
        };
      } catch (e) {
        GraphAILogger.info("file: " + file);
        GraphAILogger.info(e);
        return {};
      }
    });
};

export const getAvailablePromptTemplates = (): MulmoPromptTemplateFile[] => {
  return getPromptTemplates<MulmoPromptTemplateFile>(promptTemplateDirName, mulmoPromptTemplateSchema);
};
export const getAvailableScriptTemplates = (): MulmoScript[] => {
  return getPromptTemplates<MulmoScript>(scriptTemplateDirName, null);
};
// end of template

export const writingMessage = (filePath: string): void => {
  GraphAILogger.debug(`writing: ${filePath}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readAndParseJson = <S extends ZodSchema<any>>(filePath: string, schema: S): z.output<S> => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(fileContent);
  return schema.parse(json);
};

export const generateTimestampedFileName = (prefix: string) => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${prefix}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const hashSHA256 = (text: string) => {
  return createHash("sha256").update(text, "utf8").digest("hex");
};

export const isFile = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};
