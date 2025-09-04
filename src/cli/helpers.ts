import { GraphAILogger } from "graphai";
import fs from "fs";
import path from "path";
import clipboardy from "clipboardy";
import {
  getBaseDirPath,
  getFullPath,
  getOutputStudioFilePath,
  resolveDirPath,
  mkdir,
  getOutputMultilingualFilePath,
  generateTimestampedFileName,
} from "../utils/file.js";
import { isHttp } from "../utils/utils.js";
import { outDirName, imageDirName, audioDirName } from "../utils/const.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

import { translate } from "../actions/translate.js";

import { initializeContextFromFiles } from "../utils/context.js";
import type { CliArgs } from "../types/cli_types.js";
import { FileObject, InitOptions, MulmoStudioContext } from "../types/index.js";

export const runTranslateIfNeeded = async (context: MulmoStudioContext, includeCaption: boolean = false) => {
  if (MulmoStudioContextMethods.needTranslate(context, includeCaption)) {
    GraphAILogger.log("run translate");
    await translate(context);
  }
};

export const setGraphAILogger = (verbose: boolean | undefined, logValues?: Record<string, unknown>) => {
  if (verbose) {
    if (logValues) {
      Object.entries(logValues).forEach(([key, value]) => {
        GraphAILogger.info(`${key}:`, value);
      });
    }
  } else {
    GraphAILogger.setLevelEnabled("error", false);
    GraphAILogger.setLevelEnabled("log", false);
    GraphAILogger.setLevelEnabled("warn", false);
  }
};

export const getFileObject = (args: {
  basedir?: string;
  outdir?: string;
  imagedir?: string;
  audiodir?: string;
  presentationStyle?: string;
  file: string;
  nodeModuleRootPath?: string;
}): FileObject => {
  const { basedir, outdir, imagedir, audiodir, file, presentationStyle, nodeModuleRootPath } = args;
  const baseDirPath = getBaseDirPath(basedir);
  const outDirPath = getFullPath(baseDirPath, outdir ?? outDirName);
  const { fileOrUrl, fileName } = (() => {
    if (file === "__clipboard") {
      // We generate a new unique script file from clipboard text in the output directory
      const generatedFileName = generateTimestampedFileName("script");
      const clipboardText = clipboardy.readSync();
      const json = JSON.parse(clipboardText);
      const formattedText = JSON.stringify(json, null, 2);
      const resolvedFilePath = resolveDirPath(outDirPath, `${generatedFileName}.json`);
      mkdir(outDirPath);
      fs.writeFileSync(resolvedFilePath, formattedText, "utf8");
      return { fileOrUrl: resolvedFilePath, fileName: generatedFileName };
    }
    const resolvedFileOrUrl = file ?? "";
    const parsedFileName = path.parse(resolvedFileOrUrl).name;
    return { fileOrUrl: resolvedFileOrUrl, fileName: parsedFileName };
  })();
  const isHttpPath = isHttp(fileOrUrl);
  const mulmoFilePath = isHttpPath ? "" : getFullPath(baseDirPath, fileOrUrl);
  const mulmoFileDirPath = path.dirname(isHttpPath ? baseDirPath : mulmoFilePath);
  const imageDirPath = getFullPath(outDirPath, imagedir ?? imageDirName);
  const audioDirPath = getFullPath(outDirPath, audiodir ?? audioDirName);
  const outputStudioFilePath = getOutputStudioFilePath(outDirPath, fileName);
  const outputMultilingualFilePath = getOutputMultilingualFilePath(outDirPath, fileName);
  const presentationStylePath = presentationStyle ? getFullPath(baseDirPath, presentationStyle) : undefined;
  return {
    baseDirPath,
    mulmoFilePath,
    mulmoFileDirPath,
    outDirPath,
    imageDirPath,
    audioDirPath,
    isHttpPath,
    fileOrUrl,
    outputStudioFilePath,
    outputMultilingualFilePath,
    presentationStylePath,
    fileName,
    nodeModuleRootPath,
  };
};

export const initializeContext = async (argv: CliArgs<InitOptions>, raiseError: boolean = false): Promise<MulmoStudioContext | null> => {
  const files = getFileObject({
    basedir: argv.b,
    outdir: argv.o,
    imagedir: argv.i,
    audiodir: argv.a,
    presentationStyle: argv.p,
    file: argv.file ?? "",
  });
  setGraphAILogger(Boolean(argv.v), { files });

  return await initializeContextFromFiles(files, raiseError, Boolean(argv.f), argv.c, argv.l);
};
