import path from "path";
import { BeatSessionType, MulmoStudioContext, SessionProgressCallback, SessionType } from "../types/index.js";
import { beatId } from "../utils/utils.js";
import { GraphAILogger } from "graphai";

const sessionProgressCallbacks = new Set<SessionProgressCallback>();

export const addSessionProgressCallback = (cb: SessionProgressCallback) => {
  sessionProgressCallbacks.add(cb);
};
export const removeSessionProgressCallback = (cb: SessionProgressCallback) => {
  sessionProgressCallbacks.delete(cb);
};

const notifyStateChange = (context: MulmoStudioContext, sessionType: SessionType) => {
  const inSession = context.sessionState.inSession[sessionType] ?? false;
  const prefix = inSession ? "<" : " >";
  GraphAILogger.info(`${prefix} ${sessionType}`);
  for (const callback of sessionProgressCallbacks) {
    callback({ kind: "session", sessionType, inSession });
  }
};

const notifyBeatStateChange = (context: MulmoStudioContext, sessionType: BeatSessionType, id: string) => {
  const inSession = context.sessionState.inBeatSession[sessionType][id] ?? false;
  const prefix = inSession ? "{" : " }";
  GraphAILogger.info(`${prefix} ${sessionType} ${id}`);
  for (const callback of sessionProgressCallbacks) {
    callback({ kind: "beat", sessionType, id, inSession });
  }
};

export const MulmoStudioContextMethods = {
  resolveAssetPath(context: MulmoStudioContext, relativePath: string): string {
    return path.resolve(context.fileDirs.mulmoFileDirPath, relativePath);
  },
  getAudioDirPath(context: MulmoStudioContext): string {
    return context.fileDirs.audioDirPath;
  },
  getImageDirPath(context: MulmoStudioContext): string {
    return context.fileDirs.imageDirPath;
  },
  getImageProjectDirPath(context: MulmoStudioContext): string {
    const imageDirPath = MulmoStudioContextMethods.getImageDirPath(context);
    return `${imageDirPath}/${context.studio.filename}`;
  },
  getOutDirPath(context: MulmoStudioContext): string {
    return context.fileDirs.outDirPath;
  },
  getFileName(context: MulmoStudioContext): string {
    return context.studio.filename;
  },
  getCaption(context: MulmoStudioContext): string | undefined {
    return context.studio.script.captionParams?.lang;
  },
  setSessionState(context: MulmoStudioContext, sessionType: SessionType, value: boolean) {
    context.sessionState.inSession[sessionType] = value;
    notifyStateChange(context, sessionType);
  },
  setBeatSessionState(context: MulmoStudioContext, sessionType: BeatSessionType, index: number, id: string | undefined, value: boolean) {
    const key = beatId(id, index);
    if (value) {
      if (!context.sessionState.inBeatSession[sessionType]) {
        context.sessionState.inBeatSession[sessionType] = {};
      }
      context.sessionState.inBeatSession[sessionType][key] = true;
    } else {
      // NOTE: Setting to false causes the parse error in rebuildStudio in preprocess.ts
      delete context.sessionState.inBeatSession[sessionType][key];
    }
    notifyBeatStateChange(context, sessionType, key);
  },
  needTranslate(context: MulmoStudioContext, includeCaption: boolean = false) {
    // context.studio.script.lang = defaultLang, context.lang = targetLanguage.
    if (includeCaption) {
      return (
        context.studio.script.lang !== context.lang ||
        (context.studio.script.captionParams?.lang && context.studio.script.lang !== context.studio.script.captionParams?.lang)
      );
    }
    return context.studio.script.lang !== context.lang;
  },
  getIntroPadding(context: MulmoStudioContext): number {
    if (context.studio.script.beats[0].enableLipSync) {
      // NOTE: We must set introPadding to 0 when enableLipSync is true. Otherwise, the lipsync will be out of sync.
      return 0;
    }
    return context.presentationStyle.audioParams.introPadding;
  },
};
