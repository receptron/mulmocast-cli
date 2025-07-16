import { GraphAILogger } from "graphai";
import fs from "fs";
import { readMulmoScriptFile, fetchMulmoScriptFile } from "./file.js";
import { createOrUpdateStudioData } from "./preprocess.js";
import type { MulmoStudio, MulmoScript, MulmoPresentationStyle, MulmoStudioMultiLingual } from "../types/type.js";

import { mulmoPresentationStyleSchema, mulmoStudioMultiLingualSchema, FileObject } from "../types/index.js";

export const fetchScript = async (isHttpPath: boolean, mulmoFilePath: string, fileOrUrl: string): Promise<MulmoScript | null> => {
  if (isHttpPath) {
    const res = await fetchMulmoScriptFile(fileOrUrl);
    if (!res.result || !res.script) {
      GraphAILogger.info(`ERROR: HTTP error! ${res.status} ${fileOrUrl}`);
      return null;
    }
    return res.script;
  }
  if (!fs.existsSync(mulmoFilePath)) {
    GraphAILogger.info(`ERROR: File not exists ${mulmoFilePath}`);
    return null;
  }
  return readMulmoScriptFile<MulmoScript>(mulmoFilePath, "ERROR: File does not exist " + mulmoFilePath)?.mulmoData ?? null;
};

export const getMultiLingual = (multilingualFilePath: string, studioBeatsLength: number): MulmoStudioMultiLingual => {
  if (fs.existsSync(multilingualFilePath)) {
    const jsonData =
      readMulmoScriptFile<MulmoStudioMultiLingual>(multilingualFilePath, "ERROR: File does not exist " + multilingualFilePath)?.mulmoData ?? null;
    const dataSet = mulmoStudioMultiLingualSchema.parse(jsonData);
    while (dataSet.length < studioBeatsLength) {
      dataSet.push({ multiLingualTexts: {} });
    }
    dataSet.length = studioBeatsLength;
    return dataSet;
  }
  return [...Array(studioBeatsLength)].map(() => ({ multiLingualTexts: {} }));
};

export const getPresentationStyle = (presentationStylePath: string | undefined): MulmoPresentationStyle | null => {
  if (presentationStylePath) {
    if (!fs.existsSync(presentationStylePath)) {
      throw new Error(`ERROR: File not exists ${presentationStylePath}`);
    }
    const jsonData =
      readMulmoScriptFile<MulmoPresentationStyle>(presentationStylePath, "ERROR: File does not exist " + presentationStylePath)?.mulmoData ?? null;
    return mulmoPresentationStyleSchema.parse(jsonData);
  }
  return null;
};

const initSessionState = () => {
  return {
    inSession: {
      audio: false,
      image: false,
      video: false,
      multiLingual: false,
      caption: false,
      pdf: false,
    },
    inBeatSession: {
      audio: {},
      image: {},
      movie: {},
      multiLingual: {},
      caption: {},
      html: {},
      imageReference: {},
      soundEffect: {},
    },
  };
};

const buildContext = (
  studio: MulmoStudio,
  files: FileObject,
  presentationStyle: MulmoPresentationStyle | null,
  multiLingual: MulmoStudioMultiLingual,
  force?: boolean,
  lang?: string,
) => {
  return {
    studio,
    fileDirs: files,
    force: Boolean(force),
    lang,
    sessionState: initSessionState(),
    presentationStyle: presentationStyle ?? studio.script,
    multiLingual,
  };
};

export const initializeContextFromFiles = async (files: FileObject, raiseError: boolean, force?: boolean, caption?: string, lang?: string) => {
  const { fileName, isHttpPath, fileOrUrl, mulmoFilePath, outputStudioFilePath, presentationStylePath, outputMultilingualFilePath } = files;

  // read mulmoScript, presentationStyle, currentStudio from files
  const mulmoScript = await fetchScript(isHttpPath, mulmoFilePath, fileOrUrl);
  if (!mulmoScript) {
    return null;
  }
  const presentationStyle = getPresentationStyle(presentationStylePath);
  // Create or update MulmoStudio file with MulmoScript
  const currentStudio = readMulmoScriptFile<MulmoStudio>(outputStudioFilePath);

  try {
    // validate mulmoStudioSchema. skip if __test_invalid__ is true
    const studio = createOrUpdateStudioData(mulmoScript, currentStudio?.mulmoData, fileName, caption);
    const multiLingual = getMultiLingual(outputMultilingualFilePath, studio.beats.length);

    return buildContext(studio, files, presentationStyle, multiLingual, force, lang);
  } catch (error) {
    GraphAILogger.info(`Error: invalid MulmoScript Schema: ${isHttpPath ? fileOrUrl : mulmoFilePath} \n ${error}`);
    if (raiseError) {
      throw error;
    }
    return null;
  }
};
