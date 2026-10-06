import fs from "node:fs";
import nodePath from "node:path";
import { GraphAILogger } from "graphai";
import { ImageMediaType, ImageProcessorParams, MulmoBeat, MulmoRemotionCodeSource, MulmoStudioContext } from "../../types/index.js";
import { localizedText } from "../utils.js";
import { getFullPath } from "../file.js";
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
import { FileMove, FileOps, commitFiles } from "../remotion/commit_files.js";
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

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// null when the review itself failed; undefined when the reviewer approved the scene as it is.
const askForReview = async (job: SceneJob, renderedCode: string, reviewStills: ReviewStill[], deps: RemotionDeps) => {
  try {
    return await deps.reviewComponent(buildReviewPrompt(job.spec, renderedCode, reviewStills), job.workDir);
  } catch (error) {
    GraphAILogger.info(`remotion: visual review skipped: ${errorMessage(error)}`);
    return null;
  }
};

const nodeFileOps: FileOps = {
  exists: (file) => fs.existsSync(file),
  rename: (from, to) => fs.renameSync(from, to),
  remove: (file) => fs.rmSync(file, { force: true }),
};

export const reviewCandidatePath = (filePath: string) => filePath.replace(/(\.[^./]+)$/, ".review$1");

// The reviewed version renders to side files that replace the first version's output only once it
// succeeded, so a failure leaves the scene that already rendered — files and cached code — untouched.
const renderReviewedVersion = async (job: SceneJob, improved: string, deps: RemotionDeps) => {
  const candidate: SceneJob = {
    ...job,
    codePath: reviewCandidatePath(job.codePath),
    videoPath: job.videoPath && reviewCandidatePath(job.videoPath),
    stillPath: reviewCandidatePath(job.stillPath),
  };
  try {
    const renderedImprovement = await renderWithRepair(candidate, improved, MAX_REPAIR_ATTEMPTS, deps);
    fs.writeFileSync(candidate.codePath, renderedImprovement);
    const moves: FileMove[] = [
      ...(job.videoPath && candidate.videoPath ? [{ from: candidate.videoPath, to: job.videoPath }] : []),
      { from: candidate.stillPath, to: job.stillPath },
      { from: candidate.codePath, to: job.codePath },
    ];
    commitFiles(moves, nodeFileOps);
  } catch (error) {
    GraphAILogger.info(`remotion: the reviewed version was not applied, keeping the first one: ${errorMessage(error)}`);
  } finally {
    [candidate.codePath, candidate.videoPath, candidate.stillPath].forEach((file) => file && fs.rmSync(file, { force: true }));
  }
};

const reviewAndImprove = async (job: SceneJob, renderedCode: string, reviewStills: ReviewStill[], deps: RemotionDeps) => {
  const improved = await askForReview(job, renderedCode, reviewStills, deps);
  if (improved === null) return;
  if (improved === undefined) {
    GraphAILogger.info(`remotion: visual review approved ${job.codePath}`);
    return;
  }
  GraphAILogger.info(`remotion: visual review improved ${job.codePath}`);
  await renderReviewedVersion(job, improved, deps);
};

const toFrameCount = (durationSec: number, fps: number) => {
  const frames = Math.floor(durationSec * fps);
  if (frames <= 0) {
    throw new Error(`remotion: frame count is ${frames} (duration=${durationSec}, fps=${fps}). Increase duration or fps.`);
  }
  return frames;
};

// Lets a scene number itself and pace its place in the video; unknown when the beat is not in the script.
const scenePosition = (beats: MulmoBeat[], index: number) => (index < 0 ? undefined : { index, count: beats.length });

// The words actually spoken over the scene: the translation when the video is rendered in another language.
const spokenNarration = (context: MulmoStudioContext, beat: MulmoBeat, index: number) =>
  (index < 0 ? beat.text : localizedText(beat, context.multiLingual?.[index], context.lang, context.studio.script.lang)) || undefined;

type SceneOutput = Pick<SceneJob, "workDir" | "props" | "videoPath" | "stillPath">;

const buildSceneOutput = (params: ImageProcessorParams, fps: number): SceneOutput => {
  const { beat, imagePath, canvasSize } = params;
  const duration = params.beatDuration ?? beat.duration;
  return {
    workDir: remotionWorkDir(imagePath),
    props: { durationInFrames: toFrameCount(duration ?? STILL_ONLY_DURATION_SEC, fps), fps, width: canvasSize.width, height: canvasSize.height },
    videoPath: duration !== undefined ? imagePath : undefined,
    stillPath: remotionStillPath(imagePath),
  };
};

const buildJob = (params: ImageProcessorParams, prompt: string, fps: number): SceneJob => {
  const { beat, context, canvasSize } = params;
  const index = context.studio.script.beats.indexOf(beat);
  const spec: RemotionSceneSpec = {
    prompt,
    narration: spokenNarration(context, beat, index),
    brief: context.presentationStyle.remotionParams?.brief || undefined,
    position: scenePosition(context.studio.script.beats, index),
    fps,
    width: canvasSize.width,
    height: canvasSize.height,
  };
  const output = buildSceneOutput(params, fps);
  return { ...output, spec, codePath: nodePath.join(output.workDir, `${remotionCacheKey(spec)}.tsx`) };
};

// Named in errors, so whoever wrote the component (usually the host's agent) knows what to fix.
export const remotionCodeLocation = (code: MulmoRemotionCodeSource, context: MulmoStudioContext, beatIndex: number) => {
  if (code.kind === "path") return getFullPath(context.fileDirs.mulmoFileDirPath, code.path);
  return beatIndex < 0 ? "inline code" : `inline code of beat ${beatIndex + 1}`;
};

const readGivenComponent = (code: MulmoRemotionCodeSource, location: string) => {
  if (code.kind === "text") return code.text;
  try {
    return fs.readFileSync(location, "utf8");
  } catch (error) {
    throw new Error(`remotion: cannot read the component file ${location}`, { cause: error });
  }
};

// A given component is the caller's to fix, so a failed render stops here instead of asking claude -p to repair it.
const renderGivenComponent = async (params: ImageProcessorParams, code: MulmoRemotionCodeSource, fps: number, deps: RemotionDeps) => {
  const output = buildSceneOutput(params, fps);
  const location = remotionCodeLocation(code, params.context, params.context.studio.script.beats.indexOf(params.beat));
  deps.ensurePackages();
  const source = readGivenComponent(code, location);
  fs.mkdirSync(output.workDir, { recursive: true });
  fs.writeFileSync(nodePath.join(output.workDir, REMOTION_COMPONENT_FILE), source);
  try {
    await deps.renderScene({ workDir: output.workDir, props: output.props, videoPath: output.videoPath, stillPath: output.stillPath });
  } catch (error) {
    throw new Error(`remotion beat failed to render the given component (code: ${location}): ${errorMessage(error)}`, { cause: error });
  }
  return output.videoPath ?? output.stillPath;
};

export const createRemotionProcess = (deps: RemotionDeps) => async (params: ImageProcessorParams) => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const { prompt, code: givenCode } = beat.image;
  const fps = beat.image.fps ?? DEFAULT_FPS;
  if (givenCode) return await renderGivenComponent(params, givenCode, fps, deps);
  if (!prompt) throw new Error("remotion: give exactly one of prompt or code");

  const job = buildJob(params, prompt, fps);
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
