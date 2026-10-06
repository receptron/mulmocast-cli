import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { REMOTION_COMPOSITION_ID, REMOTION_ENTRY_FILE, buildEntrySource } from "./claude_prompt.js";
import { missingRemotionPackages, remotionInstallCommand } from "./packages.js";

// WebGL (three.js scenes) needs the ANGLE backend; the default one cannot create a context headless.
const CHROMIUM_OPTIONS = { gl: "angle" } as const;

export type RemotionSceneProps = { durationInFrames: number; fps: number; width: number; height: number };

export type RemotionRenderRequest = {
  workDir: string;
  props: RemotionSceneProps;
  videoPath?: string;
  stillPath: string;
  extraStills?: { frame: number; path: string }[];
};

export type SceneRenderer = (request: RemotionRenderRequest) => Promise<void>;

const loadRemotion = async () => {
  try {
    const [bundler, renderer] = await Promise.all([import("@remotion/bundler"), import("@remotion/renderer")]);
    return { bundle: bundler.bundle, renderer };
  } catch (error) {
    throw new Error(`The remotion beat needs these packages: ${remotionInstallCommand()}`, { cause: error });
  }
};

// A package that hides its package.json (three does) is still installed; only "not found" means missing.
const isPackageInstalled = (name: string) => {
  try {
    createRequire(import.meta.url).resolve(`${name}/package.json`);
    return true;
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND");
  }
};

// Checked before asking claude -p for a component: a generated import of a missing optional peer
// would otherwise surface as an opaque bundling error after the generation was already paid for.
export const ensureRemotionPackages = () => {
  const missing = missingRemotionPackages(isPackageInstalled);
  if (missing.length > 0) {
    throw new Error(`The remotion beat needs packages that are not installed (${missing.join(", ")}). Install them with: ${remotionInstallCommand()}`);
  }
};

// The generated code sits in the output directory, which usually has no node_modules above it that
// holds react/remotion — so resolve them from wherever remotion itself is installed.
const remotionNodeModulesDir = () => {
  const remotionPackageJson = createRequire(import.meta.url).resolve("remotion/package.json");
  return path.dirname(path.dirname(remotionPackageJson));
};

export const renderRemotionScene: SceneRenderer = async ({ workDir, props, videoPath, stillPath, extraStills = [] }) => {
  const { bundle, renderer } = await loadRemotion();
  const entryPoint = path.join(workDir, REMOTION_ENTRY_FILE);
  fs.writeFileSync(entryPoint, buildEntrySource());

  const nodeModulesDir = remotionNodeModulesDir();
  const serveUrl = await bundle({
    entryPoint,
    outDir: path.join(workDir, "bundle"),
    webpackOverride: (config) => ({
      ...config,
      resolve: { ...config.resolve, modules: [...(config.resolve?.modules ?? ["node_modules"]), nodeModulesDir] },
    }),
  });
  const composition = await renderer.selectComposition({ serveUrl, id: REMOTION_COMPOSITION_ID, inputProps: props, chromiumOptions: CHROMIUM_OPTIONS });
  if (videoPath) {
    await renderer.renderMedia({ composition, serveUrl, codec: "h264", outputLocation: videoPath, inputProps: props, chromiumOptions: CHROMIUM_OPTIONS });
  }
  const stills = [...extraStills, { frame: composition.durationInFrames - 1, path: stillPath }];
  await stills.reduce(async (previous, still) => {
    await previous;
    await renderer.renderStill({ composition, serveUrl, output: still.path, frame: still.frame, inputProps: props, chromiumOptions: CHROMIUM_OPTIONS });
  }, Promise.resolve());
};
