import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createMockContext } from "../actions/utils.js";
import { createRemotionProcess, remotionCodeLocation, remotionStillPath, remotionWorkDir, RemotionDeps } from "../../src/utils/image_plugins/remotion.js";
import type { RemotionRenderRequest } from "../../src/utils/remotion/render.js";
import { REMOTION_SYSTEM_PROMPT } from "../../src/utils/remotion/system_prompt.js";
import { mulmoRemotionMediaSchema } from "../../src/types/schema.js";
import type { ImageProcessorParams, MulmoBeat, MulmoRemotionCodeSource, MulmoStudioContext } from "../../src/types/index.js";
import * as remotionEntry from "../../src/index.remotion.js";
import { trackedTmpDirs } from "../tmp_dirs.js";

const canvasSize = { width: 1280, height: 720 };
const component = "export default function Scene() { return null; }\n";

const makeTmpDir = trackedTmpDirs("remotion-code-test-");

const contextIn = (scriptDir: string): MulmoStudioContext => {
  const base = createMockContext();
  return { ...base, fileDirs: { ...base.fileDirs, mulmoFileDirPath: scriptDir } };
};

const codeBeat = (code: MulmoRemotionCodeSource): MulmoBeat => ({ text: "Hello", image: { type: "remotion", code } });

const makeParams = (beat: MulmoBeat, overrides: Partial<ImageProcessorParams> = {}): ImageProcessorParams => ({
  beat,
  context: createMockContext(),
  imagePath: path.join(makeTmpDir(), "1p_animated.mp4"),
  textSlideStyle: "",
  canvasSize,
  ...overrides,
});

const makeFakes = (options: { renderError?: Error; missingPackages?: boolean } = {}) => {
  const calls = { claude: 0 };
  const renders: (RemotionRenderRequest & { code: string })[] = [];
  const deps: RemotionDeps = {
    ensurePackages: () => {
      if (options.missingPackages) throw new Error("The remotion beat needs packages that are not installed (three)");
    },
    writeComponent: async () => {
      calls.claude += 1;
      return component;
    },
    reviewComponent: async () => {
      calls.claude += 1;
      return undefined;
    },
    renderScene: async (request) => {
      renders.push({ ...request, code: fs.readFileSync(path.join(request.workDir, "Generated.tsx"), "utf8") });
      if (options.renderError) throw options.renderError;
    },
  };
  return { deps, calls, renders };
};

test("mulmoRemotionMediaSchema: exactly one of prompt or code", () => {
  const parse = (image: object) => mulmoRemotionMediaSchema.safeParse({ type: "remotion", ...image }).success;
  assert.ok(parse({ code: { kind: "text", text: component } }));
  assert.ok(parse({ code: { kind: "path", path: "scenes/intro.tsx" }, fps: 24 }));
  assert.ok(!parse({}), "neither");
  assert.ok(!parse({ prompt: "x", code: { kind: "text", text: component } }), "both");
  assert.ok(!parse({ code: { kind: "text", text: "" } }), "empty text");
  assert.ok(!parse({ code: { kind: "path", path: "" } }), "empty path");
  assert.ok(!parse({ code: { kind: "url", url: "https://example.com/a.tsx" } }), "url is not a code source");
  assert.ok(!parse({ code: { kind: "text", text: component, extra: 1 } }), "strict");
});

test("remotion code: inline code is rendered as is, without claude", async () => {
  const { deps, calls, renders } = makeFakes();
  const params = makeParams(codeBeat({ kind: "text", text: component }), { beatDuration: 2 });
  const result = await createRemotionProcess(deps)(params);

  assert.strictEqual(result, params.imagePath);
  assert.strictEqual(calls.claude, 0);
  assert.strictEqual(renders.length, 1);
  assert.strictEqual(renders[0].code, component);
  assert.strictEqual(renders[0].workDir, remotionWorkDir(params.imagePath));
  assert.deepStrictEqual(renders[0].props, { durationInFrames: 60, fps: 30, width: 1280, height: 720 });
  assert.deepStrictEqual(renders[0].extraStills, undefined, "no review frames");
});

test("remotion code: a path is read relative to the script, fps comes from the beat", async () => {
  const scriptDir = makeTmpDir();
  fs.mkdirSync(path.join(scriptDir, "scenes"));
  fs.writeFileSync(path.join(scriptDir, "scenes", "intro.tsx"), component);
  const { deps, renders } = makeFakes();
  const beat: MulmoBeat = { text: "", image: { type: "remotion", code: { kind: "path", path: "scenes/intro.tsx" }, fps: 24 } };
  await createRemotionProcess(deps)(makeParams(beat, { beatDuration: 1, context: contextIn(scriptDir) }));
  assert.strictEqual(renders[0].code, component);
  assert.strictEqual(renders[0].props.durationInFrames, 24);
});

test("remotion code: without a duration only the still is rendered and returned", async () => {
  const { deps, renders } = makeFakes();
  const params = makeParams(codeBeat({ kind: "text", text: component }));
  const result = await createRemotionProcess(deps)(params);
  assert.strictEqual(result, remotionStillPath(params.imagePath));
  assert.strictEqual(renders[0].videoPath, undefined);
});

test("remotion code: a render failure stops with the code's location and the error, without a repair", async () => {
  const scriptDir = makeTmpDir();
  fs.writeFileSync(path.join(scriptDir, "broken.tsx"), component);
  const { deps, calls, renders } = makeFakes({ renderError: new Error("Module not found: lodash") });
  const params = makeParams(codeBeat({ kind: "path", path: "broken.tsx" }), { beatDuration: 2, context: contextIn(scriptDir) });
  await assert.rejects(createRemotionProcess(deps)(params), (error: Error) => {
    assert.ok(error.message.includes(path.join(scriptDir, "broken.tsx")), error.message);
    assert.ok(error.message.includes("Module not found: lodash"), error.message);
    return true;
  });
  assert.strictEqual(calls.claude, 0);
  assert.strictEqual(renders.length, 1);
});

test("remotion code: a missing file says which file", async () => {
  const scriptDir = makeTmpDir();
  const { deps, renders } = makeFakes();
  const params = makeParams(codeBeat({ kind: "path", path: "nope.tsx" }), { context: contextIn(scriptDir) });
  await assert.rejects(createRemotionProcess(deps)(params), new RegExp(`cannot read the component file .*nope\\.tsx`));
  assert.strictEqual(renders.length, 0);
});

test("remotion code: missing packages stop the beat before rendering", async () => {
  const { deps, renders } = makeFakes({ missingPackages: true });
  await assert.rejects(createRemotionProcess(deps)(makeParams(codeBeat({ kind: "text", text: component }))), /not installed/);
  assert.strictEqual(renders.length, 0);
});

test("remotionCodeLocation: the full path for a file, the beat for inline code", () => {
  const context = contextIn("/scripts/demo");
  assert.strictEqual(remotionCodeLocation({ kind: "path", path: "scenes/a.tsx" }, context, 0), path.resolve("/scripts/demo", "scenes/a.tsx"));
  assert.strictEqual(remotionCodeLocation({ kind: "path", path: "/abs/a.tsx" }, context, 0), path.normalize("/abs/a.tsx"));
  assert.strictEqual(remotionCodeLocation({ kind: "text", text: component }, context, 2), "inline code of beat 3");
  assert.strictEqual(remotionCodeLocation({ kind: "text", text: component }, context, -1), "inline code");
});

test("mulmocast/remotion: the guide states the contract without claude -p's reply format", () => {
  const guide = remotionEntry.REMOTION_COMPONENT_GUIDE;
  assert.ok(guide.includes("`export default` the scene component"));
  assert.ok(guide.includes("useCurrentFrame()"));
  assert.ok(remotionEntry.REMOTION_SCENE_PACKAGES.every((name) => guide.includes(`"${name}"`)));
  assert.ok(!guide.includes("Reply with ONLY"));
  assert.ok(!guide.includes("senior motion designer"));
});

test("mulmocast/remotion: packages and the install check are exported", () => {
  assert.deepStrictEqual(remotionEntry.REMOTION_PACKAGES, [...remotionEntry.REMOTION_RENDER_PACKAGES, ...remotionEntry.REMOTION_SCENE_PACKAGES]);
  assert.ok(remotionEntry.remotionInstallCommand().startsWith("npm install remotion "));
  const missing = remotionEntry.missingInstalledRemotionPackages();
  assert.ok(missing.every((name) => remotionEntry.REMOTION_PACKAGES.includes(name)));
  assert.strictEqual(typeof remotionEntry.ensureRemotionPackages, "function");
});

// The system prompt is part of every cached component's key: changing it makes every user's
// generated scenes call claude -p again. Update this hash only when that is intended.
const SYSTEM_PROMPT_SHA256 = "3e7a56f73f1ebbfaad8f78fd90412c3a14df3912a833047a2087820bb0bcbcdc";

test("REMOTION_SYSTEM_PROMPT: unchanged, so cached components stay valid", () => {
  assert.strictEqual(createHash("sha256").update(REMOTION_SYSTEM_PROMPT, "utf8").digest("hex"), SYSTEM_PROMPT_SHA256);
});
