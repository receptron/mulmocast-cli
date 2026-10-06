import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { REMOTION_COMPOSITION_ID, REMOTION_ENTRY_FILE, buildEntrySource } from "./claude_prompt.js";

const REMOTION_PACKAGES = "remotion @remotion/bundler @remotion/renderer react react-dom";

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
    throw new Error(`The remotion beat needs these packages: npm install ${REMOTION_PACKAGES}`, { cause: error });
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
