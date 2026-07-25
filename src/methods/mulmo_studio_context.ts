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
  MulmoStudioBeat,
  ImageMediaType,
  text2SpeechProviderSchema,
  SpeechOptions,
} from "../types/index.js";
import { beatId } from "../utils/utils.js";
import { GraphAILogger } from "graphai";
import { MulmoPresentationStyleMethods } from "./mulmo_presentation_style.js";
import { MulmoBeatMethods } from "./mulmo_beat.js";
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

  // Intro/outro padding is the only padding not already folded into studio.beats[].duration.
  getExtraPadding(context: MulmoStudioContext, index: number): number {
    if (index === 0) {
      return MulmoStudioContextMethods.getIntroPadding(context);
    } else if (index === context.studio.beats.length - 1) {
      return context.presentationStyle.audioParams.outroPadding;
    }
    return 0;
  },
  // The duration this beat occupies on the audio timeline.
  getBeatDuration(context: MulmoStudioContext, index: number): number {
    return (context.studio.beats[index]?.duration ?? 0) + MulmoStudioContextMethods.getExtraPadding(context, index);
  },
  // The total duration of the voice_over beats which follow (and share the shot of) this beat.
  getVoiceOverGroupDuration(context: MulmoStudioContext, index: number): number {
    const trailingBeats = context.studio.script.beats.slice(index + 1);
    const groupEnd = trailingBeats.findIndex((beat) => !MulmoBeatMethods.isVoiceOver(beat));
    const groupSize = groupEnd < 0 ? trailingBeats.length : groupEnd;
    return trailingBeats.slice(0, groupSize).reduce((total, _, offset) => total + MulmoStudioContextMethods.getBeatDuration(context, index + 1 + offset), 0);
  },
  // Whether this beat's source is a movie (as opposed to a still which has to be looped).
  isMovieBeat(context: MulmoStudioContext, studioBeat: MulmoStudioBeat, beat: MulmoBeat): boolean {
    return !!(
      studioBeat.lipSyncFile ||
      studioBeat.movieFile ||
      MulmoPresentationStyleMethods.getImageType(context.presentationStyle, beat) === ImageMediaType.Movie
    );
  },
  // How long this beat's video segment is: its own duration plus the trailing voice_over beats which
  // share its shot (they have no video segment of their own), never shorter than its movie. This is
  // the single rule for a segment's length -- createVideo builds from it and transitions clamp against it.
  getSegmentDuration(context: MulmoStudioContext, index: number): number {
    const ownDuration = MulmoStudioContextMethods.getBeatDuration(context, index) + MulmoStudioContextMethods.getVoiceOverGroupDuration(context, index);
    return Math.max(ownDuration, context.studio.beats[index]?.movieDuration ?? 0);
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
