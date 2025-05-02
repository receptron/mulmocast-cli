import fs from "fs";
import path from "path";
import { MulmoScript } from "../types";

import { outDirName, scratchpadDirName } from "./const";

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

export function readMulmoScriptFile<T = MulmoScript>(arg2: string, errorMessage?: string) {
  const scriptPath = path.resolve(arg2);
  if (!fs.existsSync(scriptPath)) {
    if (errorMessage) {
      console.error(errorMessage);
      process.exit(1);
    }
    return null;
  }
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as T;
  const parsedPath = path.parse(scriptPath);

  return {
    mulmoData: script,
    mulmoDataPath: scriptPath,
    fileName: parsedPath.name,
  };
}

export const getOutputStudioFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + "_studio.json");
};
export const getOutputBGMFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + "_bgm.mp3");
};
export const getOutputVideoFilePath = (outDirPath: string, fileName: string) => {
  return path.resolve(outDirPath, fileName + ".mp4");
};

export const getScratchpadFilePath = (fileName: string) => {
  const filePath = path.resolve(scratchpadDirName + fileName);
  return filePath;
};

export const getBaseDirPath = () => {
  return path.resolve("./");
};

export const mkdir = (dirPath: string) => {
  const currentDir = process.cwd();
  const imagesDir = path.join(currentDir, dirPath);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
};

export const silentPath = path.resolve(__dirname, "../../music/silent300.mp3");
export const silentLastPath = path.resolve(__dirname, "../../music/silent800.mp3");
