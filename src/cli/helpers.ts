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
import { outDirName, imageDirName, audioDirName } from "../types/const.js";
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

type UsageGroup = {
  provider: string;
  model: string;
  records: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  predictSec: number;
  inputChars: number;
};

const summarizeUsage = (context: MulmoStudioContext) => {
  const snapshot = context.usageCollector?.snapshot() ?? [];
  const groups = new Map<string, UsageGroup>();
  for (const record of snapshot) {
    const key = `${record.provider}:${record.model}`;
    const group = groups.get(key) ?? {
      provider: record.provider,
      model: record.model,
      records: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      predictSec: 0,
      inputChars: 0,
    };
    group.records += 1;
    group.inputTokens += record.inputTokens ?? 0;
    group.outputTokens += record.outputTokens ?? 0;
    group.totalTokens += record.totalTokens ?? 0;
    group.predictSec += record.predictSec ?? 0;
    group.inputChars += record.inputChars ?? 0;
    groups.set(key, group);
  }
  return { records: snapshot.length, byModel: Array.from(groups.values()), snapshot };
};

// Opt-in usage dump after a CLI action completes. Controlled by
// MULMOCAST_DUMP_USAGE:
//   - unset / empty → no-op (zero overhead)
//   - "1" / "true" / "stdout" → print JSON to stdout via GraphAILogger.info
//   - any other value → treated as a file path and the JSON is written there
//
// The API/billing layer reads context.usageCollector directly; this is for
// local CLI verification only.
export const dumpUsageIfRequested = (context: MulmoStudioContext) => {
  const setting = process.env.MULMOCAST_DUMP_USAGE;
  if (!setting) return;
  const payload = summarizeUsage(context);
  const json = JSON.stringify(payload, null, 2);
  if (setting === "1" || setting === "true" || setting === "stdout") {
    GraphAILogger.info(json);
    return;
  }
  fs.writeFileSync(setting, json, "utf-8");
  GraphAILogger.info(`usage written to ${setting}`);
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
    GraphAILogger.setLevelEnabled("debug", false);
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
  grouped?: boolean;
}): FileObject => {
  const { basedir, outdir, imagedir, audiodir, file, presentationStyle, nodeModuleRootPath, grouped = false } = args;
  const baseDirPath = getBaseDirPath(basedir);
  const baseOutDirPath = getFullPath(baseDirPath, outdir ?? outDirName);
  const { fileOrUrl, fileName } = (() => {
    if (file === "__clipboard") {
      // We generate a new unique script file from clipboard text in the output directory
      const generatedFileName = generateTimestampedFileName("script");
      const clipboardText = clipboardy.readSync();
      const json = JSON.parse(clipboardText);
      const formattedText = JSON.stringify(json, null, 2);
      const resolvedFilePath = resolveDirPath(baseOutDirPath, `${generatedFileName}.json`);
      mkdir(baseOutDirPath);
      fs.writeFileSync(resolvedFilePath, formattedText, "utf8");
      return { fileOrUrl: resolvedFilePath, fileName: generatedFileName };
    }
    const resolvedFileOrUrl = file ?? "";
    const parsedFileName = path.parse(resolvedFileOrUrl).name;
    return { fileOrUrl: resolvedFileOrUrl, fileName: parsedFileName };
  })();
  const outDirPath = grouped ? getFullPath(baseOutDirPath, fileName) : baseOutDirPath;
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
    grouped,
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
    grouped: Boolean(argv.g),
  });
  setGraphAILogger(Boolean(argv.v), { files });

  return await initializeContextFromFiles(files, raiseError, Boolean(argv.f), Boolean(argv.backup), argv.c, argv.l);
};
