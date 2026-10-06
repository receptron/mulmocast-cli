import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRemotionFrameRenderer, framePlan, RemotionFramesDeps } from "../../src/utils/remotion/render_frames.js";
import { REMOTION_REVIEW_FRACTIONS, frameAtFraction, toFrameCount } from "../../src/utils/remotion/frames.js";
import type { RemotionRenderRequest } from "../../src/utils/remotion/render.js";
import * as remotionEntry from "../../src/index.remotion.js";

const component = "export default function Scene() { return null; }\n";

const makeTmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "remotion-frames-test-"));

const makeFakes = (options: { renderError?: Error; missingPackages?: boolean } = {}) => {
  const renders: (RemotionRenderRequest & { code: string })[] = [];
  const workDirs: string[] = [];
  const deps: RemotionFramesDeps = {
    ensurePackages: () => {
      if (options.missingPackages) throw new Error("The remotion beat needs packages that are not installed (three)");
    },
    renderScene: async (request) => {
      renders.push({ ...request, code: fs.readFileSync(path.join(request.workDir, "Generated.tsx"), "utf8") });
      if (options.renderError) throw options.renderError;
      (request.extraStills ?? []).forEach((still) => fs.writeFileSync(still.path, `frame ${still.frame}`));
    },
    makeWorkDir: () => {
      const dir = makeTmpDir();
      workDirs.push(dir);
      return dir;
    },
  };
  return { deps, renders, workDirs };
};

test("frameAtFraction: floors, and clamps to the last frame", () => {
  assert.strictEqual(frameAtFraction(180, 0), 0);
  assert.strictEqual(frameAtFraction(180, 0.3), 54);
  assert.strictEqual(frameAtFraction(180, 0.95), 171);
  assert.strictEqual(frameAtFraction(180, 1), 179);
  assert.strictEqual(frameAtFraction(1, 0.5), 0);
});

test("toFrameCount: duration × fps, floored; zero frames is an error", () => {
  assert.strictEqual(toFrameCount(6, 30), 180);
  assert.strictEqual(toFrameCount(1.5, 24), 36);
  assert.throws(() => toFrameCount(0.01, 30), /frame count is 0/);
  assert.throws(() => toFrameCount(0, 30), /frame count is 0/);
});

test("framePlan: one PNG per fraction, named by order and percent", () => {
  assert.deepStrictEqual(framePlan(180, [0.3, 1], "/out"), [
    { fraction: 0.3, frame: 54, path: path.join("/out", "frame_0_030.png") },
    { fraction: 1, frame: 179, path: path.join("/out", "frame_1_100.png") },
  ]);
  const same = framePlan(100, [0.5, 0.5], "/out").map((frame) => frame.path);
  assert.strictEqual(new Set(same).size, 2, "repeated fractions do not overwrite each other");
});

test("renderRemotionFrames: renders the default review fractions as stills only, into outDir", async () => {
  const { deps, renders, workDirs } = makeFakes();
  const outDir = path.join(makeTmpDir(), "frames");
  const frames = await createRemotionFrameRenderer(deps)({ code: component, durationSec: 6, outDir });

  assert.deepStrictEqual(
    frames.map(({ fraction, frame }) => ({ fraction, frame })),
    REMOTION_REVIEW_FRACTIONS.map((fraction) => ({ fraction, frame: frameAtFraction(180, fraction) })),
  );
  frames.forEach((frame) => assert.strictEqual(fs.readFileSync(frame.path, "utf8"), `frame ${frame.frame}`));
  assert.strictEqual(renders.length, 1);
  assert.strictEqual(renders[0].code, component);
  assert.strictEqual(renders[0].videoPath, undefined, "no video");
  assert.strictEqual(renders[0].stillPath, undefined, "no final still beyond the requested frames");
  assert.deepStrictEqual(renders[0].props, { durationInFrames: 180, fps: 30, width: 1920, height: 1080 });
  assert.deepStrictEqual(fs.readdirSync(outDir).sort(), ["frame_0_030.png", "frame_1_060.png", "frame_2_095.png"]);
  assert.ok(!fs.existsSync(workDirs[0]), "the work directory is removed");
});

test("renderRemotionFrames: fps, canvas and fractions come from the request", async () => {
  const { deps, renders } = makeFakes();
  const frames = await createRemotionFrameRenderer(deps)({
    code: component,
    durationSec: 2,
    fps: 24,
    width: 640,
    height: 360,
    fractions: [0, 1],
    outDir: makeTmpDir(),
  });
  assert.deepStrictEqual(renders[0].props, { durationInFrames: 48, fps: 24, width: 640, height: 360 });
  assert.deepStrictEqual(
    frames.map((frame) => frame.frame),
    [0, 47],
  );
});

test("renderRemotionFrames: bad fractions and durations stop before rendering", async () => {
  const { deps, renders } = makeFakes();
  const render = createRemotionFrameRenderer(deps);
  const base = { code: component, durationSec: 2, outDir: makeTmpDir() };
  await assert.rejects(render({ ...base, fractions: [] }), /fractions is empty/);
  await assert.rejects(render({ ...base, fractions: [0.5, 1.2] }), /between 0 and 1 \(got 1.2\)/);
  await assert.rejects(render({ ...base, fractions: [-0.1] }), /between 0 and 1/);
  await assert.rejects(render({ ...base, fractions: [Number.NaN] }), /between 0 and 1/);
  await assert.rejects(render({ ...base, durationSec: 0 }), /frame count is 0/);
  assert.strictEqual(renders.length, 0);
});

test("renderRemotionFrames: missing packages stop before rendering", async () => {
  const { deps, renders } = makeFakes({ missingPackages: true });
  await assert.rejects(createRemotionFrameRenderer(deps)({ code: component, durationSec: 2, outDir: makeTmpDir() }), /not installed/);
  assert.strictEqual(renders.length, 0);
});

test("renderRemotionFrames: a render failure carries the renderer's error, and the work directory is still removed", async () => {
  const { deps, workDirs } = makeFakes({ renderError: new Error("Module not found: lodash") });
  await assert.rejects(
    createRemotionFrameRenderer(deps)({ code: component, durationSec: 2, outDir: makeTmpDir() }),
    /failed to render the component's frames: Module not found: lodash/,
  );
  assert.ok(!fs.existsSync(workDirs[0]));
});

test("mulmocast/remotion: exports renderRemotionFrames and the review fractions", () => {
  assert.strictEqual(typeof remotionEntry.renderRemotionFrames, "function");
  assert.deepStrictEqual(remotionEntry.REMOTION_REVIEW_FRACTIONS, [0.3, 0.6, 0.95]);
});
