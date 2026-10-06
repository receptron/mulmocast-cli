import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMockContext } from "../actions/utils.js";
import { createRemotionProcess, remotionStillPath, remotionWorkDir, reviewCandidatePath, RemotionDeps } from "../../src/utils/image_plugins/remotion.js";
import { remotionCacheKey } from "../../src/utils/remotion/claude_prompt.js";
import type { RemotionRenderRequest } from "../../src/utils/remotion/render.js";
import { mulmoRemotionMediaSchema } from "../../src/types/schema.js";
import { MulmoBeatMethods } from "../../src/methods/index.js";
import type { MulmoBeat, ImageProcessorParams } from "../../src/types/index.js";

const canvasSize = { width: 1280, height: 720 };
const componentA = "export default function A() { return null; }\n";
const componentB = "export default function B() { return null; }\n";

const makeTmpImagePath = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "remotion-test-")), "1p_animated.mp4");

const makeParams = (imagePath: string, beat: MulmoBeat, overrides: Partial<ImageProcessorParams> = {}): ImageProcessorParams => ({
  beat,
  context: createMockContext(),
  imagePath,
  textSlideStyle: "",
  canvasSize,
  ...overrides,
});

const remotionBeat = (fps?: number): MulmoBeat => ({ text: "", image: { type: "remotion", prompt: "A title fades in", ...(fps ? { fps } : {}) } });

type ReviewReply = string | undefined | Error;

const makeFakes = (options: { replies?: string[]; renderFailures?: number; reviews?: ReviewReply[]; failingCode?: string; missingPackages?: boolean } = {}) => {
  const replies = [...(options.replies ?? [componentA])];
  const reviews = [...(options.reviews ?? [])];
  const prompts: string[] = [];
  const reviewPrompts: string[] = [];
  const renders: RemotionRenderRequest[] = [];
  const renderedCode: string[] = [];
  const failuresLeft = { count: options.renderFailures ?? 0 };
  const deps: RemotionDeps = {
    ensurePackages: () => {
      if (options.missingPackages) throw new Error("The remotion beat needs packages that are not installed (three)");
    },
    writeComponent: async (prompt) => {
      prompts.push(prompt);
      return replies.shift() ?? componentA;
    },
    reviewComponent: async (prompt) => {
      reviewPrompts.push(prompt);
      const reply = reviews.shift();
      if (reply instanceof Error) throw reply;
      return reply;
    },
    renderScene: async (request) => {
      renders.push(request);
      const code = fs.readFileSync(path.join(request.workDir, "Generated.tsx"), "utf8");
      renderedCode.push(code);
      if (code === options.failingCode) {
        throw new Error("Cannot read properties of undefined");
      }
      if (failuresLeft.count > 0) {
        failuresLeft.count -= 1;
        throw new Error("Module not found: three");
      }
      // the outputs carry the code that produced them, so a test can tell which version is in place
      [request.videoPath, request.stillPath].forEach((file) => file && fs.writeFileSync(file, code));
    },
  };
  return { deps, prompts, reviewPrompts, renders, renderedCode };
};

test("mulmoRemotionMediaSchema: needs a prompt, accepts fps in range", () => {
  assert.ok(mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "x" }).success);
  assert.ok(mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "x", fps: 24 }).success);
  assert.ok(!mulmoRemotionMediaSchema.safeParse({ type: "remotion" }).success);
  assert.ok(!mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "" }).success);
  assert.ok(!mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "x", fps: 0 }).success);
  assert.ok(!mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "x", fps: 61 }).success);
  assert.ok(!mulmoRemotionMediaSchema.safeParse({ type: "remotion", prompt: "x", extra: 1 }).success);
});

test("isPluginVideo: remotion and animated html_tailwind write their own video, others do not", () => {
  assert.strictEqual(MulmoBeatMethods.isPluginVideo(remotionBeat()), true);
  assert.strictEqual(MulmoBeatMethods.isPluginVideo({ text: "", image: { type: "html_tailwind", html: "<p/>", animation: true } }), true);
  assert.strictEqual(MulmoBeatMethods.isPluginVideo({ text: "", image: { type: "html_tailwind", html: "<p/>" } }), false);
  assert.strictEqual(MulmoBeatMethods.isPluginVideo({ text: "", image: { type: "markdown", markdown: "# x" } }), false);
  assert.strictEqual(MulmoBeatMethods.isPluginVideo({ text: "" }), false);
});

test("reviewCandidatePath: a side file next to the real one, same extension", () => {
  assert.strictEqual(reviewCandidatePath("/out/a/1p_animated.mp4"), "/out/a/1p_animated.review.mp4");
  assert.strictEqual(reviewCandidatePath("/out/a/1p.png"), "/out/a/1p.review.png");
  assert.strictEqual(reviewCandidatePath("/out/a.b/1p_remotion/abc.tsx"), "/out/a.b/1p_remotion/abc.review.tsx");
});

test("remotionWorkDir / remotionStillPath: derived from the beat's video path", () => {
  assert.strictEqual(remotionWorkDir("/out/images/a/1p_animated.mp4"), "/out/images/a/1p_remotion");
  assert.strictEqual(remotionWorkDir("/out/images/a/1p.png"), "/out/images/a/1p_remotion");
  assert.strictEqual(remotionStillPath("/out/images/a/1p_animated.mp4"), "/out/images/a/1p.png");
});

test("remotion process: with a duration, renders the video and the final still, and returns the video", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts, renders } = makeFakes();
  const result = await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 4.5 }));

  assert.strictEqual(result, imagePath);
  assert.strictEqual(prompts.length, 1);
  assert.ok(prompts[0].startsWith("A title fades in"));
  assert.strictEqual(renders.length, 1);
  assert.deepStrictEqual(renders[0].props, { durationInFrames: 135, fps: 30, width: 1280, height: 720 });
  assert.strictEqual(renders[0].videoPath, imagePath);
  assert.strictEqual(renders[0].stillPath, remotionStillPath(imagePath));
});

test("remotion process: beat.duration is used when no audio duration is given", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, renders } = makeFakes();
  const beat = { ...remotionBeat(24), duration: 2 };
  await createRemotionProcess(deps)(makeParams(imagePath, beat));
  assert.deepStrictEqual(renders[0].props, { durationInFrames: 48, fps: 24, width: 1280, height: 720 });
});

test("remotion process: without any duration, renders only the still and returns it", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, renders } = makeFakes();
  const result = await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat()));
  assert.strictEqual(result, remotionStillPath(imagePath));
  assert.strictEqual(renders[0].videoPath, undefined);
  assert.ok(renders[0].props.durationInFrames > 0);
});

test("remotion process: a duration too short for one frame is an error", async () => {
  const { deps } = makeFakes();
  await assert.rejects(createRemotionProcess(deps)(makeParams(makeTmpImagePath(), remotionBeat(), { beatDuration: 0.01 })), /frame count is 0/);
});

test("remotion process: the generated component is cached by its inputs", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts, renderedCode } = makeFakes({ replies: [componentA, componentB] });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 3 }));

  assert.strictEqual(prompts.length, 1, "a new length re-renders without asking claude again");
  assert.deepStrictEqual(renderedCode, [componentA, componentA]);
  const cached = path.join(remotionWorkDir(imagePath), `${remotionCacheKey({ prompt: "A title fades in", fps: 30, ...canvasSize })}.tsx`);
  assert.strictEqual(fs.readFileSync(cached, "utf8"), componentA);
});

test("remotion process: a changed prompt or fps asks claude again", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts } = makeFakes({ replies: [componentA, componentB, componentA] });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  await run(makeParams(imagePath, remotionBeat(24), { beatDuration: 2 }));
  await run(makeParams(imagePath, { text: "", image: { type: "remotion", prompt: "Another scene" } }, { beatDuration: 2 }));
  assert.strictEqual(prompts.length, 3);
});

test("remotion process: the beat's text is sent as narration and is part of the cache key", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts } = makeFakes({ replies: [componentA, componentB] });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, { ...remotionBeat(), text: "重さは100グラム" }, { beatDuration: 2 }));
  await run(makeParams(imagePath, { ...remotionBeat(), text: "価格は1299ドル" }, { beatDuration: 2 }));
  assert.strictEqual(prompts.length, 2);
  assert.ok(prompts[0].includes("重さは100グラム"));
  assert.ok(prompts[1].includes("価格は1299ドル"));
});

test("remotion process: force regenerates even when cached", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts, renderedCode } = makeFakes({ replies: [componentA, componentB] });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  const context = { ...createMockContext(), force: true };
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2, context }));
  assert.strictEqual(prompts.length, 2);
  assert.deepStrictEqual(renderedCode, [componentA, componentB]);
});

test("remotion process: a render failure is sent back to claude, and the repaired code is cached", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts, renders, renderedCode } = makeFakes({ replies: [componentA, componentB], renderFailures: 1 });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));

  assert.strictEqual(renders.length, 2);
  assert.deepStrictEqual(renderedCode, [componentA, componentB]);
  assert.strictEqual(prompts.length, 2);
  assert.ok(prompts[1].includes("Module not found: three"));
  assert.ok(prompts[1].includes(componentA));

  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  assert.strictEqual(prompts.length, 2, "the repaired component is the cached one");
  assert.strictEqual(renderedCode[2], componentB);
});

test("remotion process: gives up after the repair attempts and says where the code is", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts, renders } = makeFakes({ renderFailures: Number.POSITIVE_INFINITY });
  await assert.rejects(createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 2 })), (error: Error) => {
    assert.match(error.message, /failed to render after repairs/);
    assert.ok(error.message.includes(remotionWorkDir(imagePath)));
    return true;
  });
  assert.strictEqual(renders.length, prompts.length, "every repair is rendered once");
  assert.ok(renders.length > 1);
});

test("remotion process: ignores other beat types", async () => {
  const { deps, prompts, renders } = makeFakes();
  const result = await createRemotionProcess(deps)(makeParams(makeTmpImagePath(), { text: "", image: { type: "markdown", markdown: "# x" } }));
  assert.strictEqual(result, undefined);
  assert.strictEqual(prompts.length + renders.length, 0);
});

const cachedCodePath = (imagePath: string) =>
  path.join(remotionWorkDir(imagePath), `${remotionCacheKey({ prompt: "A title fades in", fps: 30, ...canvasSize })}.tsx`);

test("remotion review: a new scene renders review frames and is reviewed once; approval keeps it", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, reviewPrompts, renders } = makeFakes({ reviews: [undefined] });
  await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 10 }));

  assert.strictEqual(reviewPrompts.length, 1);
  assert.strictEqual(renders.length, 1);
  const stills = renders[0].extraStills ?? [];
  assert.deepStrictEqual(
    stills.map((still) => still.frame),
    [90, 180, 285],
  );
  stills.forEach((still) => assert.ok(reviewPrompts[0].includes(still.path)));
  assert.ok(reviewPrompts[0].includes(componentA));
});

test("remotion review: an improved component replaces the outputs and becomes the cached one", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, renders, renderedCode } = makeFakes({ reviews: [componentB] });
  await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));

  assert.deepStrictEqual(renderedCode, [componentA, componentB]);
  assert.strictEqual(renders[1].videoPath, reviewCandidatePath(imagePath), "the reviewed version renders to a side file");
  assert.strictEqual(renders[1].extraStills?.length ?? 0, 0, "the final render needs no review frames");
  assert.strictEqual(fs.readFileSync(imagePath, "utf8"), componentB);
  assert.strictEqual(fs.readFileSync(remotionStillPath(imagePath), "utf8"), componentB);
  assert.strictEqual(fs.readFileSync(cachedCodePath(imagePath), "utf8"), componentB);
  assert.ok(!fs.existsSync(reviewCandidatePath(imagePath)), "side files are cleaned up");
});

test("remotion review: a cached scene is not reviewed again", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, reviewPrompts } = makeFakes({ reviews: [undefined] });
  const run = createRemotionProcess(deps);
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  await run(makeParams(imagePath, remotionBeat(), { beatDuration: 3 }));
  assert.strictEqual(reviewPrompts.length, 1);
});

test("remotion review: a reviewer failure keeps the rendered scene", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, renderedCode } = makeFakes({ reviews: [new Error("rate limited")] });
  const result = await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));
  assert.strictEqual(result, imagePath);
  assert.deepStrictEqual(renderedCode, [componentA]);
  assert.strictEqual(fs.readFileSync(cachedCodePath(imagePath), "utf8"), componentA);
});

test("remotion review: a reviewed version that never renders leaves the first version's outputs and cache untouched", async () => {
  const imagePath = makeTmpImagePath();
  // the writer's repairs keep returning the broken reviewed version
  const { deps, renders } = makeFakes({ replies: [componentA, componentB, componentB], reviews: [componentB], failingCode: componentB });
  const result = await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 2 }));

  assert.strictEqual(result, imagePath);
  assert.ok(
    renders.slice(1).every((request) => request.videoPath === reviewCandidatePath(imagePath)),
    "no attempt touches the real outputs",
  );
  assert.strictEqual(fs.readFileSync(imagePath, "utf8"), componentA);
  assert.strictEqual(fs.readFileSync(remotionStillPath(imagePath), "utf8"), componentA);
  assert.strictEqual(fs.readFileSync(cachedCodePath(imagePath), "utf8"), componentA);
  const leftovers = fs.readdirSync(path.dirname(imagePath)).concat(fs.readdirSync(remotionWorkDir(imagePath)));
  assert.ok(!leftovers.some((name) => name.includes(".review.")), `side files are cleaned up: ${leftovers.join(", ")}`);
});

test("remotion process: the script's remotionParams.brief reaches every scene prompt", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts } = makeFakes();
  const base = createMockContext();
  const context = { ...base, presentationStyle: { ...base.presentationStyle, remotionParams: { brief: "navy and cyan, Inter" } } };
  await createRemotionProcess(deps)(makeParams(imagePath, remotionBeat(), { beatDuration: 2, context }));
  assert.ok(prompts[0].includes("navy and cyan, Inter"));
});

test("remotion process: a beat in the script is told its position", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts } = makeFakes();
  const context = createMockContext();
  const beats = [remotionBeat(), remotionBeat(), remotionBeat()];
  context.studio.script.beats.push(...beats);
  await createRemotionProcess(deps)(makeParams(imagePath, beats[1], { beatDuration: 2, context }));
  assert.ok(prompts[0].includes("This is scene 2 of 3."));
});

test("remotion process: missing packages stop the beat before claude is asked anything", async () => {
  const { deps, prompts, renders } = makeFakes({ missingPackages: true });
  await assert.rejects(createRemotionProcess(deps)(makeParams(makeTmpImagePath(), remotionBeat(), { beatDuration: 2 })), /not installed \(three\)/);
  assert.strictEqual(prompts.length + renders.length, 0);
});

test("remotion process: a translated render sends the spoken (translated) narration and caches it separately", async () => {
  const imagePath = makeTmpImagePath();
  const { deps, prompts } = makeFakes({ replies: [componentA, componentB] });
  const beat = { ...remotionBeat(), text: "重さは100グラム" };
  const base = createMockContext();
  base.studio.script.beats.push(beat);
  base.studio.script.lang = "ja";
  base.multiLingual.push({ multiLingualTexts: { en: { text: "It weighs 100 grams", lang: "en", texts: [], ttsTexts: [], cacheKey: "k" } } });
  const run = createRemotionProcess(deps);

  await run(makeParams(imagePath, beat, { beatDuration: 2, context: { ...base, lang: "ja" } }));
  await run(makeParams(imagePath, beat, { beatDuration: 2, context: { ...base, lang: "en" } }));

  assert.strictEqual(prompts.length, 2, "each language gets its own component");
  assert.ok(prompts[0].includes("重さは100グラム"));
  assert.ok(prompts[1].includes("It weighs 100 grams"));
  assert.ok(!prompts[1].includes("重さは100グラム"));
});
