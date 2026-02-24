import { GraphAILogger, isNull } from "graphai";
import { readMulmoScriptFile, fetchMulmoScriptFile, isFile } from "./file.js";
import { beatId, multiLingualObjectToArray } from "./utils.js";
import type {
  MulmoStudioBeat,
  MulmoStudio,
  MulmoScript,
  MulmoPresentationStyle,
  MulmoStudioMultiLingual,
  MulmoStudioMultiLingualFile,
  FileObject,
} from "../types/type.js";
import { mulmoStudioSchema, mulmoCaptionParamsSchema, mulmoPresentationStyleSchema } from "../types/schema.js";
import { MulmoPresentationStyleMethods, MulmoScriptMethods, MulmoStudioMultiLingualMethod } from "../methods/index.js";
import { loadMulmoConfig, mergeConfigWithScript } from "./mulmo_config.js";

export const silentMp3 = "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/audio/silent300.mp3";

const mulmoCredit = (speaker: string, isPortrait: boolean) => {
  return {
    id: "mulmo_credit",
    speaker,
    text: "",
    image: {
      type: "image" as const,
      source: {
        kind: "url" as const,
        url:
          "https://github.com/receptron/mulmocast-cli/raw/refs/heads/main/assets/images/" +
          (isPortrait ? "mulmocast_credit-portrait.png" : "mulmocast_credit.png"),
      },
    },
    audio: {
      type: "audio" as const,
      source: {
        kind: "url" as const,
        url: silentMp3,
      },
    },
  };
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
      markdown: false,
      html: false,
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
      lipSync: {},
    },
  };
};

export const createStudioData = (_mulmoScript: MulmoScript, fileName: string, videoCaptionLang?: string, presentationStyle?: MulmoPresentationStyle | null) => {
  // validate and insert default value
  const mulmoScript = _mulmoScript.__test_invalid__ ? _mulmoScript : MulmoScriptMethods.validate(_mulmoScript);
  // filter out hidden beats
  mulmoScript.beats = mulmoScript.beats.filter((beat) => !beat.hidden);

  // We need to parse it to fill default values
  const studio: MulmoStudio = mulmoStudioSchema.parse({
    script: mulmoScript,
    filename: fileName,
    beats: [...Array(mulmoScript.beats.length)].map(() => ({})),
  });

  const isPortrait = mulmoScript.canvasSize.height > mulmoScript.canvasSize.width;

  // TODO: Move this code out of this function later
  // Addition cloing credit
  if (mulmoScript.$mulmocast.credit === "closing") {
    const defaultSpeaker = MulmoPresentationStyleMethods.getDefaultSpeaker(presentationStyle ?? studio.script);
    mulmoScript.beats.push(mulmoCredit(mulmoScript.beats[0].speaker ?? defaultSpeaker, isPortrait)); // First speaker
  }

  studio.script = MulmoScriptMethods.validate(mulmoScript); // update the script
  studio.beats = studio.script.beats.map((_, index) => studio.beats[index] ?? {});

  if (videoCaptionLang) {
    studio.script.captionParams = mulmoCaptionParamsSchema.parse({
      ...(studio.script.captionParams ?? {}),
      lang: videoCaptionLang,
    });
  }

  return studio;
};

export const fetchScript = async (isHttpPath: boolean, mulmoFilePath: string, fileOrUrl: string): Promise<MulmoScript | null> => {
  if (isHttpPath) {
    const res = await fetchMulmoScriptFile(fileOrUrl);
    if (!res.result || !res.script) {
      GraphAILogger.info(`ERROR: HTTP error! ${res.status} ${fileOrUrl}`);
      return null;
    }
    return res.script;
  }
  if (!isFile(mulmoFilePath)) {
    GraphAILogger.info(`ERROR: File not exists ${mulmoFilePath}`);
    return null;
  }
  return readMulmoScriptFile<MulmoScript>(mulmoFilePath, "ERROR: File does not exist " + mulmoFilePath)?.mulmoData ?? null;
};

export const getMultiLingual = (multilingualFilePath: string, beats: MulmoStudioBeat[]): MulmoStudioMultiLingual => {
  if (!isFile(multilingualFilePath)) {
    return beats.reduce((tmp: MulmoStudioMultiLingual, beat: MulmoStudioBeat, index: number) => {
      const key = beatId(beat?.id, index);
      tmp[key] = { multiLingualTexts: {} };
      return tmp;
    }, {});
  }
  const jsonData =
    readMulmoScriptFile<MulmoStudioMultiLingualFile>(multilingualFilePath, "ERROR: File does not exist " + multilingualFilePath)?.mulmoData ?? null;
  return MulmoStudioMultiLingualMethod.validate(jsonData, beats);
};

export const getPresentationStyle = (presentationStylePath: string | undefined): MulmoPresentationStyle | null => {
  if (!presentationStylePath) {
    return null;
  }
  if (!isFile(presentationStylePath)) {
    throw new Error(`ERROR: File not exists ${presentationStylePath}`);
  }
  const jsonData = readMulmoScriptFile<MulmoPresentationStyle>(presentationStylePath, "ERROR: File does not exist " + presentationStylePath)?.mulmoData ?? null;
  return mulmoPresentationStyleSchema.parse(jsonData);
};

export const initializeContextFromFiles = async (
  files: FileObject,
  raiseError: boolean,
  force?: boolean,
  withBackup?: boolean,
  captionLang?: string,
  targetLang?: string,
  index?: number,
) => {
  const { fileName, isHttpPath, fileOrUrl, mulmoFilePath, presentationStylePath, outputMultilingualFilePath } = files;

  const rawScript = await fetchScript(isHttpPath, mulmoFilePath, fileOrUrl);
  if (!rawScript) {
    return null;
  }

  // Load and merge mulmo.config.json (defaults < script < override)
  const config = loadMulmoConfig(files.baseDirPath);
  const mulmoScript = config ? (mergeConfigWithScript(config, rawScript as Record<string, unknown>) as MulmoScript) : rawScript;

  // The index param is used when you want to process only a specific beat in an app, etc. This is to avoid parser errors.
  if (!isNull(index) && mulmoScript.beats[index]) {
    mulmoScript.beats = [mulmoScript.beats[index]];
  }

  try {
    const presentationStyle = getPresentationStyle(presentationStylePath);
    const studio = createStudioData(mulmoScript, fileName, captionLang, presentationStyle);
    const multiLingual = getMultiLingual(outputMultilingualFilePath, studio.script.beats);
    return {
      studio,
      multiLingual: multiLingualObjectToArray(multiLingual, studio.script.beats),
      fileDirs: files,
      presentationStyle: presentationStyle ?? studio.script,
      sessionState: initSessionState(),
      force: Boolean(force),
      backup: Boolean(withBackup),
      lang: targetLang ?? studio.script.lang, // This lang is target Language. studio.lang is default Language
    };
  } catch (error) {
    GraphAILogger.info(`Error: invalid MulmoScript Schema: ${isHttpPath ? fileOrUrl : mulmoFilePath} \n ${error}`);
    if (raiseError) {
      throw error;
    }
    return null;
  }
};
