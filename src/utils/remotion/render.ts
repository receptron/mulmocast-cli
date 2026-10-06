import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { createRequire } from "node:module";
import { GraphAILogger } from "graphai";
import type { HeadlessBrowser } from "@remotion/renderer";
import { REMOTION_COMPOSITION_ID, REMOTION_ENTRY_FILE, buildEntrySource } from "./claude_prompt.js";
import { missingRemotionPackages, remotionInstallCommand } from "./packages.js";
import { isAllowedMediaDownload, withContentSecurityPolicy } from "./network_policy.js";
import { guardSceneNetwork } from "./network_guard.js";

// WebGL (three.js scenes) needs the ANGLE backend; the default one cannot create a context headless.
const CHROMIUM_OPTIONS = { gl: "angle" } as const;
const MAX_LOGGED_URL_LENGTH = 200;

export type RemotionSceneProps = { durationInFrames: number; fps: number; width: number; height: number };

export type RemotionRenderRequest = {
  workDir: string;
  props: RemotionSceneProps;
  videoPath?: string;
  // The final frame as a PNG; a beat always needs it, a frames-only render may not.
  stillPath?: string;
  extraStills?: { frame: number; path: string }[];
};

export type SceneRenderer = (request: RemotionRenderRequest) => Promise<void>;

type RemotionModules = Awaited<ReturnType<typeof loadRemotion>>;

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

// Resolved from mulmocast's own location, which is where the renderer looks for them.
export const missingInstalledRemotionPackages = () => missingRemotionPackages(isPackageInstalled);

// Checked before asking claude -p for a component: a generated import of a missing optional peer
// would otherwise surface as an opaque bundling error after the generation was already paid for.
export const ensureRemotionPackages = () => {
  const missing = missingInstalledRemotionPackages();
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

const bundleScene = async (bundle: RemotionModules["bundle"], workDir: string) => {
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
  const indexHtml = path.join(serveUrl, "index.html");
  fs.writeFileSync(indexHtml, withContentSecurityPolicy(fs.readFileSync(indexHtml, "utf8")));
  return serveUrl;
};

const findFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => (port > 0 ? resolve(port) : reject(new Error("remotion: could not pick a port for the bundle server"))));
    });
  });

const logBlockedRequest = (url: string) => GraphAILogger.info(`remotion: blocked a network request from the scene: ${url}`);

// Throwing here stops remotion before it fetches, and fails the render.
const rejectMediaDownload = (src: string) => {
  if (!isAllowedMediaDownload(src)) throw new Error(`remotion: a scene may not load media files (${src.slice(0, MAX_LOGGED_URL_LENGTH)})`);
  return undefined;
};

type SceneOutputs = Pick<RemotionRenderRequest, "props" | "videoPath" | "stillPath" | "extraStills">;

// The bundle server listens on the port given here, the only local origin the guard lets the scene reach.
const renderOutputs = async (renderer: RemotionModules["renderer"], browser: HeadlessBrowser, serveUrl: string, port: number, outputs: SceneOutputs) => {
  const { props, videoPath, stillPath, extraStills = [] } = outputs;
  const shared = { serveUrl, inputProps: props, chromiumOptions: CHROMIUM_OPTIONS, puppeteerInstance: browser, port };
  const downloadGuard = { onDownload: rejectMediaDownload };
  const composition = await renderer.selectComposition({ ...shared, id: REMOTION_COMPOSITION_ID });
  if (videoPath) {
    await renderer.renderMedia({ ...shared, ...downloadGuard, composition, codec: "h264", outputLocation: videoPath });
  }
  const stills = stillPath ? [...extraStills, { frame: composition.durationInFrames - 1, path: stillPath }] : extraStills;
  await stills.reduce(async (previous, still) => {
    await previous;
    await renderer.renderStill({ ...shared, ...downloadGuard, composition, output: still.path, frame: still.frame });
  }, Promise.resolve());
};

export const renderRemotionScene: SceneRenderer = async ({ workDir, ...outputs }) => {
  const { bundle, renderer } = await loadRemotion();
  const serveUrl = await bundleScene(bundle, workDir);
  const port = await findFreePort();
  const browser = await renderer.openBrowser("chrome", { chromiumOptions: CHROMIUM_OPTIONS });
  try {
    const guard = await guardSceneNetwork(browser, port, logBlockedRequest);
    await renderOutputs(renderer, browser, serveUrl, port, outputs);
    if (guard.failures.length > 0) throw new Error(`remotion: the network guard failed: ${guard.failures.join("; ")}`);
  } finally {
    await browser.close({ silent: true });
  }
};
