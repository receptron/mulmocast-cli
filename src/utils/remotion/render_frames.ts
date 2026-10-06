import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REMOTION_COMPONENT_FILE } from "./claude_prompt.js";
import { REMOTION_REVIEW_FRACTIONS, frameAtFraction, toFrameCount } from "./frames.js";
import { SceneRenderer, ensureRemotionPackages, renderRemotionScene } from "./render.js";

const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

export type RemotionFramesRequest = {
  code: string;
  durationSec: number;
  outDir: string;
  fps?: number;
  width?: number;
  height?: number;
  fractions?: readonly number[];
};

export type RemotionFrame = { fraction: number; frame: number; path: string };

export type RemotionFramesDeps = {
  ensurePackages: () => void;
  renderScene: SceneRenderer;
  makeWorkDir: () => string;
};

const isValidFraction = (fraction: number) => Number.isFinite(fraction) && fraction >= 0 && fraction <= 1;

const checkFractions = (fractions: readonly number[]) => {
  if (fractions.length === 0) throw new Error("remotion: fractions is empty");
  const invalid = fractions.filter((fraction) => !isValidFraction(fraction));
  if (invalid.length > 0) throw new Error(`remotion: fractions must be between 0 and 1 (got ${invalid.join(", ")})`);
};

// Named by percent so a reader can tell which moment each file is; two fractions on one percent keep their order.
export const framePlan = (durationInFrames: number, fractions: readonly number[], outDir: string): RemotionFrame[] =>
  fractions.map((fraction, index) => {
    const percent = String(Math.round(fraction * 100)).padStart(3, "0");
    return { fraction, frame: frameAtFraction(durationInFrames, fraction), path: path.join(outDir, `frame_${index}_${percent}.png`) };
  });

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const createRemotionFrameRenderer =
  (deps: RemotionFramesDeps) =>
  async (request: RemotionFramesRequest): Promise<RemotionFrame[]> => {
    const fps = request.fps ?? DEFAULT_FPS;
    const props = {
      durationInFrames: toFrameCount(request.durationSec, fps),
      fps,
      width: request.width ?? DEFAULT_WIDTH,
      height: request.height ?? DEFAULT_HEIGHT,
    };
    const fractions = request.fractions ?? REMOTION_REVIEW_FRACTIONS;
    checkFractions(fractions);
    deps.ensurePackages();

    const frames = framePlan(props.durationInFrames, fractions, request.outDir);
    fs.mkdirSync(request.outDir, { recursive: true });
    const workDir = deps.makeWorkDir();
    try {
      fs.writeFileSync(path.join(workDir, REMOTION_COMPONENT_FILE), request.code);
      await deps.renderScene({ workDir, props, extraStills: frames.map(({ frame, path: file }) => ({ frame, path: file })) });
      return frames;
    } catch (error) {
      throw new Error(`remotion: failed to render the component's frames: ${errorMessage(error)}`, { cause: error });
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  };

// The bundle and entry files go to a temporary directory, so outDir ends up holding only the PNGs.
export const renderRemotionFrames = createRemotionFrameRenderer({
  ensurePackages: ensureRemotionPackages,
  renderScene: renderRemotionScene,
  makeWorkDir: () => fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-remotion-frames-")),
});
