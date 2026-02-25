/**
 * Browser-friendly packages only.
 * (No Node.js built-ins like fs, path, dotenv, etc.)
 * Works in both Node.js and modern browsers.
 */

import {
  BeatSessionType,
  MulmoStudioContext,
  SessionProgressCallback,
  SessionType,
  MulmoBeat,
  text2SpeechProviderSchema,
  SpeechOptions,
} from "../types/index.js";
import { beatId } from "../utils/utils.js";
import { GraphAILogger } from "graphai";
import { MulmoPresentationStyleMethods } from "./mulmo_presentation_style.js";
import { provider2TTSAgent } from "../types/provider2agent.js";

const sessionProgressCallbacks = new Set<SessionProgressCallback>();

export const addSessionProgressCallback = (cb: SessionProgressCallback) => {
  sessionProgressCallbacks.add(cb);
};
export const removeSessionProgressCallback = (cb: SessionProgressCallback) => {
  sessionProgressCallbacks.delete(cb);
};

const notifyStateChange = (context: MulmoStudioContext, sessionType: SessionType, result?: boolean) => {
  const inSession = context.sessionState.inSession[sessionType] ?? false;
  const prefix = inSession ? "<" : " >";
  GraphAILogger.info(`${prefix} ${sessionType}`);
  for (const callback of sessionProgressCallbacks) {
    if (result !== undefined) {
      callback({ kind: "session", sessionType, inSession, result });
    } else {
      callback({ kind: "session", sessionType, inSession });
    }
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
  getAudioDirPath(context: MulmoStudioContext): string {
    return context.fileDirs.audioDirPath;
  },
  getImageDirPath(context: MulmoStudioContext): string {
    return context.fileDirs.imageDirPath;
  },
  getImageProjectDirPath(context: MulmoStudioContext): string {
    const imageDirPath = MulmoStudioContextMethods.getImageDirPath(context);
    if (context.fileDirs.grouped) {
      return imageDirPath;
    }
    return `${imageDirPath}/${context.studio.filename}`;
  },
  getAudioProjectDirPath(context: MulmoStudioContext): string {
    const audioDirPath = MulmoStudioContextMethods.getAudioDirPath(context);
    if (context.fileDirs.grouped) {
      return audioDirPath;
    }
    return `${audioDirPath}/${context.studio.filename}`;
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
  setSessionState(context: MulmoStudioContext, sessionType: SessionType, value: boolean, result?: boolean) {
    context.sessionState.inSession[sessionType] = value;
    notifyStateChange(context, sessionType, result);
  },
  setBeatSessionState(context: MulmoStudioContext, sessionType: BeatSessionType | undefined, index: number, id: string | undefined, value: boolean) {
    if (!sessionType || !Object.hasOwn(context.sessionState.inBeatSession, sessionType)) {
      return;
    }
    const key = beatId(id, index);
    const session = context.sessionState.inBeatSession[sessionType];
    if (value) {
      session[key] = true;
    } else {
      // NOTE: Setting to false causes the parse error in rebuildStudio in preprocess.ts
      delete session[key];
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

  getAudioParam(
    context: MulmoStudioContext,
    beat: MulmoBeat,
    lang?: string,
  ): { provider: keyof typeof provider2TTSAgent; voiceId: string; model?: string; speechOptions: SpeechOptions } {
    const speaker = MulmoPresentationStyleMethods.getSpeaker(context, beat, lang);
    const speechOptions = { ...speaker.speechOptions, ...beat.speechOptions };
    const provider = text2SpeechProviderSchema.parse(speaker.provider) as keyof typeof provider2TTSAgent;
    return { voiceId: speaker.voiceId, provider, speechOptions, model: speaker.model };
  },
};
