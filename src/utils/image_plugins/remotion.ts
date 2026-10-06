import fs from "node:fs";
import nodePath from "node:path";
import { GraphAILogger } from "graphai";
import { ImageMediaType, ImageProcessorParams, MulmoBeat } from "../../types/index.js";
import {
  REMOTION_COMPONENT_FILE,
  RemotionSceneSpec,
  ReviewFrame,
  buildRepairPrompt,
  buildReviewPrompt,
  buildScenePrompt,
  remotionCacheKey,
} from "../remotion/claude_prompt.js";
import { ComponentReviewer, ComponentWriter, reviewComponentWithClaude, writeComponentWithClaude } from "../remotion/claude_runner.js";
import { RemotionSceneProps, SceneRenderer, ensureRemotionPackages, renderRemotionScene } from "../remotion/render.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = ImageMediaType.Remotion;

const DEFAULT_FPS = 30;
const MAX_REPAIR_ATTEMPTS = 2;
// Without audio the length is unknown; any length gives the same final frame, since the system
// prompt makes every animation finish before the end.
const STILL_ONLY_DURATION_SEC = 10;
const REVIEW_FRACTIONS = [0.3, 0.6, 0.95];

export type RemotionDeps = {
  ensurePackages: () => void;
  writeComponent: ComponentWriter;
  reviewComponent: ComponentReviewer;
  renderScene: SceneRenderer;
};

type SceneJob = { spec: RemotionSceneSpec; workDir: string; codePath: string; props: RemotionSceneProps; videoPath?: string; stillPath: string };
type ReviewStill = ReviewFrame & { frame: number };

export const remotionWorkDir = (imagePath: string) => imagePath.replace(/(_animated)?\.(mp4|png)$/, "_remotion");

export const remotionStillPath = (imagePath: string) => imagePath.replace(/_animated\.mp4$/, ".png");

const loadOrWriteComponent = async (job: SceneJob, force: boolean, deps: RemotionDeps) => {
  if (!force && fs.existsSync(job.codePath)) {
    return { code: fs.readFileSync(job.codePath, "utf8"), isNew: false };
  }
  const code = await deps.writeComponent(buildScenePrompt(job.spec), job.workDir);
  fs.writeFileSync(job.codePath, code);
  return { code, isNew: true };
};

// Resolves to the code that rendered, which is a repaired version when the given one failed.
const renderWithRepair = async (job: SceneJob, code: string, attemptsLeft: number, deps: RemotionDeps, reviewStills: ReviewStill[] = []): Promise<string> => {
  fs.writeFileSync(nodePath.join(job.workDir, REMOTION_COMPONENT_FILE), code);
  try {
    const extraStills = reviewStills.map(({ frame, file }) => ({ frame, path: file }));
    await deps.renderScene({ workDir: job.workDir, props: job.props, videoPath: job.videoPath, stillPath: job.stillPath, extraStills });
    return code;
  } catch (error) {
    if (attemptsLeft <= 0) {
      throw new Error(`remotion beat failed to render after repairs (code: ${job.codePath})`, { cause: error });
    }
    const message = error instanceof Error ? error.message : String(error);
    GraphAILogger.info(`remotion: render failed, asking claude -p to repair (${attemptsLeft} left): ${message.slice(0, 200)}`);
    const repaired = await deps.writeComponent(buildRepairPrompt(job.spec, code, message), job.workDir);
    fs.writeFileSync(job.codePath, repaired);
    return await renderWithRepair(job, repaired, attemptsLeft - 1, deps, reviewStills);
  }
};

const reviewStillsFor = (job: SceneJob): ReviewStill[] =>
  REVIEW_FRACTIONS.map((fraction, index) => ({
    fraction,
    frame: Math.min(job.props.durationInFrames - 1, Math.floor(job.props.durationInFrames * fraction)),
    file: nodePath.join(job.workDir, `review_${index}.png`),
  }));

// A failed review keeps the scene that already rendered: the review only ever improves on it.
const reviewAndImprove = async (job: SceneJob, renderedCode: string, reviewStills: ReviewStill[], deps: RemotionDeps) => {
  const improved = await deps.reviewComponent(buildReviewPrompt(job.spec, renderedCode, reviewStills), job.workDir).catch((error: unknown) => {
    GraphAILogger.info(`remotion: visual review skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  });
  if (!improved) {
    GraphAILogger.info(`remotion: visual review approved ${job.codePath}`);
    return;
  }
  GraphAILogger.info(`remotion: visual review improved ${job.codePath}`);
  try {
    fs.writeFileSync(job.codePath, improved);
    await renderWithRepair(job, improved, MAX_REPAIR_ATTEMPTS, deps);
  } catch (error) {
    GraphAILogger.info(`remotion: the reviewed version did not render, keeping the first one: ${error instanceof Error ? error.message : String(error)}`);
    fs.writeFileSync(job.codePath, renderedCode);
    await renderWithRepair(job, renderedCode, 0, deps);
  }
};

const toFrameCount = (durationSec: number, fps: number) => {
  const frames = Math.floor(durationSec * fps);
  if (frames <= 0) {
    throw new Error(`remotion: frame count is ${frames} (duration=${durationSec}, fps=${fps}). Increase duration or fps.`);
  }
  return frames;
};

// Lets a scene number itself and pace its place in the video; unknown when the beat is not in the script.
const scenePosition = (beats: MulmoBeat[], beat: MulmoBeat) => {
  const index = beats.indexOf(beat);
  return index < 0 ? undefined : { index, count: beats.length };
};

const buildJob = (params: ImageProcessorParams, prompt: string, fps: number): SceneJob => {
  const { beat, context, imagePath, canvasSize } = params;
  const duration = params.beatDuration ?? beat.duration;
  const spec: RemotionSceneSpec = {
    prompt,
    narration: beat.text || undefined,
    brief: context.presentationStyle.remotionParams?.brief || undefined,
    position: scenePosition(context.studio.script.beats, beat),
    fps,
    width: canvasSize.width,
    height: canvasSize.height,
  };
  const workDir = remotionWorkDir(imagePath);
  return {
    spec,
    workDir,
    codePath: nodePath.join(workDir, `${remotionCacheKey(spec)}.tsx`),
    props: { durationInFrames: toFrameCount(duration ?? STILL_ONLY_DURATION_SEC, fps), fps, width: spec.width, height: spec.height },
    videoPath: duration !== undefined ? imagePath : undefined,
    stillPath: remotionStillPath(imagePath),
  };
};

export const createRemotionProcess = (deps: RemotionDeps) => async (params: ImageProcessorParams) => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const job = buildJob(params, beat.image.prompt, beat.image.fps ?? DEFAULT_FPS);
  deps.ensurePackages();
  fs.mkdirSync(job.workDir, { recursive: true });
  const { code, isNew } = await loadOrWriteComponent(job, context.force, deps);
  if (isNew) {
    const reviewStills = reviewStillsFor(job);
    const renderedCode = await renderWithRepair(job, code, MAX_REPAIR_ATTEMPTS, deps, reviewStills);
    await reviewAndImprove(job, renderedCode, reviewStills, deps);
  } else {
    await renderWithRepair(job, code, MAX_REPAIR_ATTEMPTS, deps);
  }
  return job.videoPath ?? job.stillPath;
};

export const process = createRemotionProcess({
  ensurePackages: ensureRemotionPackages,
  writeComponent: writeComponentWithClaude,
  reviewComponent: reviewComponentWithClaude,
  renderScene: renderRemotionScene,
});
export const path = parrotingImagePath;
