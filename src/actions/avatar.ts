// Talking avatars (AvatarScript): for each speaker that has an avatar, one continuous, see-through
// avatar track for the whole video, speaking that speaker's beats. movie.ts overlays the tracks.
// See docs/plans/plan_avatar.md.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GraphAILogger } from "graphai";
import type { MulmoAvatarPosition, MulmoAvatarTrack, MulmoBeat, MulmoStudioContext, MulmoSpeakerAvatar } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods } from "../methods/index.js";
import { getFullPath, getOutputStudioFilePath } from "../utils/file.js";
import { localizedText } from "../utils/utils.js";

const DEFAULT_POSITION = { x: "84%", y: "100%", scale: "62%" };

export type AvatarSegmentPlan = {
  beatIndex: number;
  text: string;
  audio: string;
  /** absolute seconds on the final timeline */
  start: number;
  emotion?: "neutral" | "happy" | "sad" | "angry" | "surprised" | "relaxed";
  motions?: { motion: string; at?: string }[];
};

export type AvatarTrackPlan = {
  speakerId: string;
  /** absolute path of the avatar package */
  source: string;
  position: Required<MulmoAvatarPosition>;
  segments: AvatarSegmentPlan[];
  hidden: [number, number][];
  /** length of the whole video, seconds */
  duration: number;
};

const mergePosition = (...positions: (MulmoAvatarPosition | undefined)[]): Required<MulmoAvatarPosition> =>
  positions.reduce<Required<MulmoAvatarPosition>>((acc, p) => ({ ...acc, ...Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined)) }), {
    ...DEFAULT_POSITION,
  });

const percent = (value: string, of: number) => (of * parseFloat(value)) / 100;

/** Which beats each avatar speaks, where and when. Pure: reads the studio, writes nothing. */
export const planAvatarTracks = (context: MulmoStudioContext): AvatarTrackPlan[] => {
  const { script, beats: studioBeats } = context.studio;
  const introPadding = MulmoStudioContextMethods.getIntroPadding(context);
  const duration = studioBeats.reduce((total, _, index) => total + MulmoStudioContextMethods.getBeatDuration(context, index), 0);
  const tracks = new Map<string, AvatarTrackPlan & { avatar: MulmoSpeakerAvatar; firstBeat?: MulmoBeat }>();
  script.beats.forEach((beat, index) => {
    const found = MulmoPresentationStyleMethods.getSpeakerAvatar(context.presentationStyle, beat, context.lang);
    if (!found) return;
    const track = tracks.get(found.speakerId) ?? {
      speakerId: found.speakerId,
      avatar: found.avatar,
      source: getFullPath(context.fileDirs.mulmoFileDirPath, found.avatar.source),
      position: DEFAULT_POSITION,
      segments: [],
      hidden: [],
      duration,
    };
    tracks.set(found.speakerId, track);
    const studioBeat = studioBeats[index];
    const start = (studioBeat?.startAt ?? 0) + introPadding;
    if (beat.avatarParams?.hidden) {
      track.hidden.push([start, start + (studioBeat?.duration ?? 0)]);
      return;
    }
    const text = localizedText(beat, context.multiLingual?.[index], context.lang, script.lang);
    if (!text || !studioBeat?.audioFile) return;
    track.firstBeat ??= beat;
    track.segments.push({
      beatIndex: index,
      text,
      audio: studioBeat.audioFile,
      start,
      emotion: beat.avatarParams?.emotion,
      motions: beat.avatarParams?.motions,
    });
  });
  return [...tracks.values()].map(({ avatar, firstBeat, ...track }) => ({
    ...track,
    // a track stays in one place: script defaults, then the speaker's avatar, then its first beat
    position: mergePosition(context.presentationStyle.avatarParams?.position, avatar.position, firstBeat?.avatarParams?.position),
  }));
};

type AvatarScriptModule = typeof import("avatarscript");

const loadAvatarScript = async (): Promise<AvatarScriptModule> => {
  try {
    return await import("avatarscript");
  } catch (error) {
    throw new Error("Avatars need the avatarscript package and onnxruntime-node: npm install avatarscript onnxruntime-node", { cause: error });
  }
};

/** Renders one track (or reuses it), returning where it goes on the canvas. */
const renderAvatarTrack = async (plan: AvatarTrackPlan, context: MulmoStudioContext, avatarscript: AvatarScriptModule): Promise<MulmoAvatarTrack> => {
  const canvas = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);
  const avatar = await avatarscript.loadAvatar(plan.source);
  // even dimensions for the video codecs
  const height = Math.round(percent(plan.position.scale, canvas.height) / 2) * 2;
  const width = Math.round((height * avatarscript.avatarAspect(avatar.rig)) / 2) * 2;
  const x = Math.round(percent(plan.position.x, canvas.width) - width / 2);
  const y = Math.round(percent(plan.position.y, canvas.height) - height);
  const identity = { version: 1, plan, width, height };
  const hash = createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 12);
  const dir = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const name = `avatar_${plan.speakerId.replace(/[^\w-]/g, "_")}_${hash}`;
  const file = path.resolve(dir, `${name}.webm`);
  if (!context.force && fs.existsSync(file)) {
    GraphAILogger.info(`avatar: reusing ${file}`);
  } else {
    GraphAILogger.info(`avatar: rendering ${plan.speakerId} (${plan.segments.length} beats, ${plan.duration.toFixed(1)} s)`);
    fs.mkdirSync(dir, { recursive: true });
    const { score, audio } = await avatarscript.compileTimeline(plan.segments, {
      lang: context.lang,
      duration: plan.duration,
      view: { background: "transparent" },
    });
    const voice = path.resolve(dir, `${name}.wav`);
    fs.writeFileSync(voice, avatarscript.toWav(audio));
    await avatarscript.render({ avatar, score, audioPath: voice, audio: false, out: file, width, height });
  }
  return { speaker: plan.speakerId, file, x, y, width, height, hidden: plan.hidden };
};

/** The `avatar` action: renders the avatar tracks into studio.avatarTracks (none when no speaker has an avatar). */
export const avatar = async (context: MulmoStudioContext): Promise<MulmoStudioContext> => {
  const plans = planAvatarTracks(context).filter((plan) => plan.segments.length > 0);
  if (plans.length === 0) return context;
  const avatarscript = await loadAvatarScript();
  const tracks: MulmoAvatarTrack[] = [];
  for (const plan of plans) tracks.push(await renderAvatarTrack(plan, context, avatarscript));
  context.studio.avatarTracks = tracks;
  const outputStudioFilePath = getOutputStudioFilePath(MulmoStudioContextMethods.getOutDirPath(context), MulmoStudioContextMethods.getFileName(context));
  fs.writeFileSync(outputStudioFilePath, JSON.stringify(context.studio, null, 2));
  return context;
};
