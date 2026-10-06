// Talking avatars (AvatarScript): for each speaker that has an avatar, one continuous, see-through
// avatar track for the whole video, speaking that speaker's beats. movie.ts overlays the tracks.
// See docs/plans/plan_avatar.md.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GraphAILogger } from "graphai";
import type { MulmoAvatarPosition, MulmoAvatarTrack, MulmoStudioContext, MulmoSpeakerAvatar } from "../types/index.js";
import { MulmoPresentationStyleMethods, MulmoStudioContextMethods } from "../methods/index.js";
import { getFullPath, getOutputStudioFilePath } from "../utils/file.js";
import { isHttp, localizedText } from "../utils/utils.js";

const DEFAULT_POSITION = { x: "84%", y: "100%", scale: "62%" };
// Show the whole avatar image. A rig may crop the top of its image (a flat cut edge, hidden when the
// avatar fills the frame); over a slide the cut would run through the head.
const PAD_TOP = 0;

export type AvatarSegmentPlan = {
  beatIndex: number;
  text: string;
  audio: string;
  /** absolute seconds on the final timeline */
  start: number;
  emotion?: "neutral" | "happy" | "sad" | "angry" | "surprised" | "relaxed";
  motions?: { motion: string; at?: string }[];
};

/** Where the avatar is during one stretch of the video (absolute seconds, end exclusive). */
export type AvatarPlacementPlan = { start: number; end: number; position: Required<MulmoAvatarPosition> };

export type AvatarTrackPlan = {
  speakerId: string;
  /** the avatar package: an absolute path, or an http(s) URL */
  source: string;
  segments: AvatarSegmentPlan[];
  /** where the avatar is shown, beat by beat; it is not shown outside these */
  placements: AvatarPlacementPlan[];
  /** length of the whole video, seconds */
  duration: number;
};

const mergePosition = (...positions: (MulmoAvatarPosition | undefined)[]): Required<MulmoAvatarPosition> =>
  positions.reduce<Required<MulmoAvatarPosition>>((acc, p) => ({ ...acc, ...Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined)) }), {
    ...DEFAULT_POSITION,
  });

const percent = (value: string, of: number) => (of * parseFloat(value)) / 100;

const samePosition = (a: Required<MulmoAvatarPosition>, b: Required<MulmoAvatarPosition>) => a.x === b.x && a.y === b.y && a.scale === b.scale;

type TrackState = AvatarTrackPlan & { avatar: MulmoSpeakerAvatar; current: Required<MulmoAvatarPosition> };

/** Adds [start, end) at `position`, joining it to the previous stretch when nothing changes. */
const place = (track: TrackState, start: number, end: number, position: Required<MulmoAvatarPosition>) => {
  const last = track.placements.at(-1);
  if (last && last.end === start && samePosition(last.position, position)) last.end = end;
  else track.placements.push({ start, end, position });
};

/**
 * Which beats each avatar speaks, and where it stands, beat by beat. Pure: reads the studio,
 * writes nothing. Position: the beat's avatarParams, then the speaker's avatar, then the script's
 * avatarParams, then the defaults; during other speakers' beats the avatar stays where it was.
 */
export const planAvatarTracks = (context: MulmoStudioContext): AvatarTrackPlan[] => {
  const { script, beats: studioBeats } = context.studio;
  const introPadding = MulmoStudioContextMethods.getIntroPadding(context);
  const duration = studioBeats.reduce((total, _, index) => total + MulmoStudioContextMethods.getBeatDuration(context, index), 0);
  const scriptPosition = context.presentationStyle.avatarParams?.position;
  const tracks = new Map<string, TrackState>();
  script.beats.forEach((beat) => {
    const found = MulmoPresentationStyleMethods.getSpeakerAvatar(context.presentationStyle, beat, context.lang);
    if (!found || tracks.has(found.speakerId)) return;
    tracks.set(found.speakerId, {
      speakerId: found.speakerId,
      avatar: found.avatar,
      source: isHttp(found.avatar.source) ? found.avatar.source : getFullPath(context.fileDirs.mulmoFileDirPath, found.avatar.source),
      segments: [],
      placements: [],
      duration,
      current: mergePosition(scriptPosition, found.avatar.position),
    });
  });
  // each beat's stretch of the video: the first one starts at 0 (its intro padding), the rest at their narration
  const starts = studioBeats.map((studioBeat, index) => (index === 0 ? 0 : (studioBeat.startAt ?? 0) + introPadding));
  script.beats.forEach((beat, index) => {
    const studioBeat = studioBeats[index];
    const windowEnd = starts[index + 1] ?? duration;
    const speaker = MulmoPresentationStyleMethods.getSpeakerAvatar(context.presentationStyle, beat, context.lang)?.speakerId;
    tracks.forEach((track) => {
      const own = track.speakerId === speaker;
      if (own) track.current = mergePosition(scriptPosition, track.avatar.position, beat.avatarParams?.position);
      if (!(own && beat.avatarParams?.hidden)) place(track, starts[index], windowEnd, track.current);
      const text = localizedText(beat, context.multiLingual?.[index], context.lang, script.lang);
      if (!own || beat.avatarParams?.hidden || !text || !studioBeat?.audioFile) return;
      track.segments.push({
        beatIndex: index,
        text,
        audio: studioBeat.audioFile,
        start: (studioBeat.startAt ?? 0) + introPadding,
        emotion: beat.avatarParams?.emotion,
        motions: beat.avatarParams?.motions,
      });
    });
  });
  return [...tracks.values()].map(({ avatar: __avatar, current: __current, ...track }) => track);
};

type AvatarScriptModule = typeof import("avatarscript");

const INSTALL_HINT = "Avatars need the avatarscript and onnxruntime-node packages: npm install avatarscript onnxruntime-node";
// a variable, so TypeScript does not need onnxruntime-node installed (it is optional, ~290 MB)
const ONNX_RUNTIME = "onnxruntime-node";

const loadAvatarScript = (): Promise<AvatarScriptModule> =>
  import("avatarscript").catch((error: unknown) => {
    throw new Error(INSTALL_HINT, { cause: error });
  });

// AvatarScript times the speech by forced alignment, which runs on onnxruntime-node. Only rendering
// needs it.
const ensureOnnxRuntime = () =>
  import(ONNX_RUNTIME).catch((error: unknown) => {
    throw new Error(INSTALL_HINT, { cause: error });
  });

// Size and modification time: what the cache key sees of a file, so that replacing it (new speech at
// the same path, an edited avatar) renders the track again.
const fileStamp = (file: string) => {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  return stat ? `${stat.size}:${stat.mtimeMs}` : null;
};
const folderStamp = (dir: string) => {
  const stat = fs.statSync(dir, { throwIfNoEntry: false });
  if (!stat?.isDirectory()) return fileStamp(dir);
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
    .map((file) => [path.relative(dir, file), fileStamp(file)]);
};

// An avatar at a URL: its small JSON files (avatar.json, the rig, layers.json, sprites.json) change
// whenever the avatar is edited or rebuilt, so they stand in for the files' stamps. They are fetched
// on every run; avatarscript caches the images.
const fetchText = async (url: URL) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`avatar: ${url.href}: HTTP ${response.status}`);
  return response.text();
};
export const avatarUrlStamp = async (source: string) => {
  const url = new URL(source);
  const folder = new URL(url);
  folder.pathname = url.pathname.endsWith("/avatar.json") ? url.pathname.slice(0, -"avatar.json".length) : url.pathname.replace(/\/?$/, "/");
  // the source's query (a version, a signature) goes with every file that has no query of its own
  const at = (file: string, base: URL) => {
    const location = new URL(file, base);
    if (!location.search) location.search = url.search;
    return location;
  };
  const manifestText = await fetchText(at("avatar.json", folder));
  const manifest = manifestText ? (JSON.parse(manifestText) as { root?: string; assets?: { rig?: string; layers?: string; sprites?: string } }) : undefined;
  const root = at((manifest?.root ?? ".").replace(/\/?$/, "/"), folder);
  const files = [
    manifest?.assets?.rig ?? "rig.json",
    manifest?.assets?.layers ?? "built/layers.json",
    manifest?.assets?.sprites ?? "built/sprites/sprites.json",
  ];
  return [manifestText, ...(await Promise.all(files.map((file) => fetchText(at(file, root)))))];
};
const sourceStamp = (source: string) => (isHttp(source) ? avatarUrlStamp(source) : folderStamp(source));

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2); // video codecs need even sizes

/** Renders one track (or reuses it), returning where it goes on the canvas. */
const renderAvatarTrack = async (
  plan: AvatarTrackPlan,
  context: MulmoStudioContext,
  getAvatarScript: () => Promise<AvatarScriptModule>,
): Promise<MulmoAvatarTrack> => {
  const canvas = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);
  // rendered once, at the largest size it is shown; smaller placements scale it down
  const height = even(Math.max(...plan.placements.map((p) => percent(p.position.scale, canvas.height))));
  const segments = plan.segments.map((segment) => ({ ...segment, audioStamp: fileStamp(segment.audio) }));
  const identity = { version: 4, segments, source: plan.source, sourceStamp: await sourceStamp(plan.source), duration: plan.duration, height, padTop: PAD_TOP };
  const hash = createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 12);
  const dir = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const name = `avatar_${plan.speakerId.replace(/[^\w-]/g, "_")}_${hash}`;
  const file = path.resolve(dir, `${name}.webm`);
  // the avatar's width / height, kept next to the track so that reusing it needs no avatarscript
  const infoFile = path.resolve(dir, `${name}.json`);
  const aspect = await (async () => {
    if (!context.force && fs.existsSync(file) && fs.existsSync(infoFile)) {
      GraphAILogger.info(`avatar: reusing ${file}`);
      return (JSON.parse(fs.readFileSync(infoFile, "utf-8")) as { aspect: number }).aspect;
    }
    GraphAILogger.info(`avatar: rendering ${plan.speakerId} (${plan.segments.length} beats, ${plan.duration.toFixed(1)} s)`);
    const avatarscript = await getAvatarScript();
    await ensureOnnxRuntime();
    const avatar = await avatarscript.loadAvatar(plan.source);
    const avatarAspect = avatarscript.avatarAspect(avatar.rig, PAD_TOP);
    fs.mkdirSync(dir, { recursive: true });
    const { score, audio } = await avatarscript.compileTimeline(plan.segments, {
      lang: context.lang,
      duration: plan.duration,
      view: { background: "transparent" },
    });
    const voice = path.resolve(dir, `${name}.wav`);
    fs.writeFileSync(voice, avatarscript.toWav(audio));
    await avatarscript.render({ avatar, score, audioPath: voice, audio: false, out: file, width: even(height * avatarAspect), height, padTop: PAD_TOP });
    fs.writeFileSync(infoFile, JSON.stringify({ aspect: avatarAspect }));
    return avatarAspect;
  })();
  const width = even(height * aspect);
  const placements = plan.placements.map(({ start, end, position }) => {
    const h = even(percent(position.scale, canvas.height));
    const w = even(h * aspect);
    return { start, end, x: Math.round(percent(position.x, canvas.width) - w / 2), y: Math.round(percent(position.y, canvas.height) - h), width: w, height: h };
  });
  return { speaker: plan.speakerId, file, width, height, placements };
};

/** The `avatar` action: renders the avatar tracks into studio.avatarTracks (none when no speaker has an avatar). */
export const avatar = async (context: MulmoStudioContext): Promise<MulmoStudioContext> => {
  const allPlans = planAvatarTracks(context);
  const plans = allPlans.filter((plan) => plan.segments.length > 0);
  if (plans.length === 0) {
    // no stale tracks from an earlier run; [] when there are avatars but nothing for them to say
    if (allPlans.length > 0) context.studio.avatarTracks = [];
    else delete context.studio.avatarTracks;
    return context;
  }
  // loaded only when a track has to be rendered: a cached track needs neither avatarscript nor onnxruntime-node
  const getAvatarScript = (() => {
    const loaded: { module?: Promise<AvatarScriptModule> } = {};
    return () => (loaded.module ??= loadAvatarScript());
  })();
  const tracks: MulmoAvatarTrack[] = [];
  for (const plan of plans) tracks.push(await renderAvatarTrack(plan, context, getAvatarScript));
  context.studio.avatarTracks = tracks;
  const outputStudioFilePath = getOutputStudioFilePath(MulmoStudioContextMethods.getOutDirPath(context), MulmoStudioContextMethods.getFileName(context));
  fs.writeFileSync(outputStudioFilePath, JSON.stringify(context.studio, null, 2));
  return context;
};
