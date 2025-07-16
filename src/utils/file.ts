import fs from "fs";
import path from "path";
import { parse as yamlParse } from "yaml";
import { fileURLToPath } from "url";
import { GraphAILogger } from "graphai";
import type { MulmoScript, MulmoScriptTemplateFile, MulmoStudioContext } from "../types/index.js";
import { MulmoScriptTemplateMethods, MulmoStudioContextMethods } from "../methods/index.js";
import { mulmoScriptTemplateSchema } from "../types/schema.js";
import { PDFMode } from "../types/index.js";
import { ZodSchema } from "zod";

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
  if (!fs.existsSync(scriptPath)) {
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
export const getAudioArtifactFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + ".mp3");
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
  if (beat?.id) {
    return `${imageProjectDirPath}/${beat.id}.png`;
  }
  return `${imageProjectDirPath}/${index}${imageSuffix}.png`;
};

export const getBeatMoviePaths = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const beat = context.studio.script.beats[index]; // beat could be undefined only in a test case.
  const filename = beat?.id ? `${beat.id}` : `${index}`;
  return { movieFile: `${imageProjectDirPath}/${filename}.mov`, soundEffectFile: `${imageProjectDirPath}/${filename}_sound.mov` };
};

export const getReferenceImagePath = (context: MulmoStudioContext, key: string, extension: string) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  return `${imageProjectDirPath}/${key}.${extension}`;
};
export const getCaptionImagePath = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  return `${imageProjectDirPath}/${index}_caption.png`;
};

// pdf
export const getOutputPdfFilePath = (outDirPath: string, fileName: string, pdfMode: PDFMode, lang?: string) => {
  if (lang) {
    return path.resolve(outDirPath, `${fileName}_${pdfMode}_${lang}.pdf`);
  }
  return path.resolve(outDirPath, `${fileName}_${pdfMode}.pdf`);
};
export const getTemplateFilePath = (templateName: string) => {
  return path.resolve(npmRoot, "./assets/templates/" + templateName + ".json");
};

export const mkdir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    GraphAILogger.info("mkdir: " + dirPath);
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// export const silentPath = path.resolve(npmRoot, "./assets/audio/silent300.mp3");
// export const silentLastPath = path.resolve(npmRoot, "./assets/audio/silent800.mp3");
export const silent60secPath = () => path.resolve(npmRoot, "./assets/audio/silent60sec.mp3");
export const defaultBGMPath = () => "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3";

export const getHTMLFile = (filename: string) => {
  const htmlPath = path.resolve(npmRoot, `./assets/html/${filename}.html`);
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

export const readScriptTemplateFile = (scriptName: string) => {
  const scriptPath = path.resolve(npmRoot, "./scripts/templates", scriptName);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  // NOTE: We don't want to schema parse the script here to eliminate default values.
  return JSON.parse(scriptData);
};

export const readTemplatePrompt = (templateName: string) => {
  const templatePath = getTemplateFilePath(templateName);
  const templateData = fs.readFileSync(templatePath, "utf-8");
  // NOTE: We don't want to schema parse the template here to eliminate default values.
  const template = JSON.parse(templateData);

  const script = (() => {
    if (template.scriptName) {
      const scriptData = readScriptTemplateFile(template.scriptName);
      return { ...scriptData, ...(template.presentationStyle ?? {}) };
    }
    return undefined;
  })();
  const prompt = MulmoScriptTemplateMethods.getSystemPrompt(template, script);
  return prompt;
};

export const getAvailableTemplates = (): MulmoScriptTemplateFile[] => {
  const templatesDir = path.resolve(npmRoot, "./assets/templates");

  if (!fs.existsSync(templatesDir)) {
    return [];
  }

  const files = fs.readdirSync(templatesDir);
  return files.map((file) => {
    const template = JSON.parse(fs.readFileSync(path.resolve(templatesDir, file), "utf-8"));
    return {
      ...mulmoScriptTemplateSchema.parse(template),
      filename: file.replace(/\.json$/, ""),
    };
  });
};

export const writingMessage = (filePath: string) => {
  GraphAILogger.debug(`writing: ${filePath}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readAndParseJson = <S extends ZodSchema<any>>(filePath: string, schema: S): ReturnType<S["parse"]> => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(fileContent);
  return schema.parse(json);
};

export const generateTimestampedFileName = (prefix: string) => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${prefix}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};
