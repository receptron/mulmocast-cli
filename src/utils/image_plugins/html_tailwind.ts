import fs from "node:fs";
import nodePath from "node:path";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoBeatMethods } from "../../methods/mulmo_beat.js";
import { getHTMLFile, getJSFile } from "../file.js";
import { renderHTMLToImage, interpolate, renderHTMLToFrames, renderHTMLToVideo } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";
import { parrotingImagePath } from "./utils.js";
import { swipeElementsToHtml, swipeElementsToScript, type SwipeElement } from "../swipe_to_html.js";
import { threeDslToHtmlAndScript, type ThreeDslConfig } from "../three_to_html.js";

export const imageType = "html_tailwind";

/**
 * Resolve image:name references to file:// absolute paths using imageRefs.
 * e.g., src="image:bg_office" → src="file:///abs/path/to/bg_office.png"
 */
export const resolveImageRefs = (html: string, imageRefs: Record<string, string>): string => {
  return html.replace(/(\bsrc\s*=\s*)(["'])image:([^"']+)\2/gi, (match, prefix, quote, name) => {
    const resolvedPath = imageRefs[name];
    if (!resolvedPath) {
      return match;
    }
    return `${prefix}${quote}file://${resolvedPath}${quote}`;
  });
};

/**
 * Resolve relative paths in src attributes to file:// absolute paths.
 * Paths starting with http://, https://, file://, data:, image:, or / are left unchanged.
 */
export const resolveRelativeImagePaths = (html: string, baseDirPath: string): string => {
  return html.replace(/(\bsrc\s*=\s*)(["'])((?!https?:\/\/|file:\/\/|data:|image:|\/)[^"']+)\2/gi, (_, prefix, quote, relativePath) => {
    const absolutePath = nodePath.resolve(baseDirPath, relativePath);
    return `${prefix}${quote}file://${absolutePath}${quote}`;
  });
};

/**
 * Resolve relative modelUrl assignment in user scripts to file:// absolute paths.
 * e.g. const modelUrl = "models/a.glb" -> const modelUrl = "file:///abs/models/a.glb"
 */
export const resolveRelativeModelPathsInScript = (html: string, baseDirPath: string): string => {
  return html.replace(/((?:const|let|var)\s+modelUrl\s*=\s*["'])((?!https?:\/\/|file:\/\/|data:|\/)[^"']+)(["'])/g, (_, prefix, relativePath, suffix) => {
    const absolutePath = nodePath.resolve(baseDirPath, relativePath);
    return `${prefix}file://${absolutePath}${suffix}`;
  });
};

const DEFAULT_ANIMATION_FPS = 30;

/** Join html field into a single string (handles both string and string[]) */
const joinHtml = (html: string | string[]): string => {
  return Array.isArray(html) ? html.join("\n") : html;
};

const buildUserScript = (script: string | string[] | undefined): string => {
  if (!script) return "";
  const code = Array.isArray(script) ? script.join("\n") : script;
  // If user script contains ESM import/export, emit module script so imports work.
  const isModule = /^\s*(import|export)\s/m.test(code);
  return isModule ? `<script type="module">\n${code}\n</script>` : `<script>\n${code}\n</script>`;
};

/**
 * Resolve HTML and script from beat image data.
 * If `elements` (Swipe-style) is provided, convert to HTML + script.
 * Otherwise, use raw `html` and `script` fields.
 */
const resolveHtmlAndScript = (
  imageData: {
    html?: string | string[];
    script?: string | string[];
    elements?: SwipeElement[];
    three?: ThreeDslConfig;
  },
  baseDirPath: string,
): { html: string; script: string | string[] | undefined } => {
  if (imageData.elements && Array.isArray(imageData.elements) && imageData.elements.length > 0) {
    const html = swipeElementsToHtml(imageData.elements);
    const generatedScript = swipeElementsToScript(imageData.elements);
    // Merge with user-provided script if any
    const userScript = imageData.script ? joinHtml(imageData.script as string | string[]) : "";
    const combinedScript = [generatedScript, userScript].filter(Boolean).join("\n");
    return { html, script: combinedScript || undefined };
  }
  if (imageData.three) {
    return threeDslToHtmlAndScript(imageData.three, baseDirPath);
  }
  return {
    html: joinHtml(imageData.html ?? ""),
    script: imageData.script,
  };
};

const getAnimationConfig = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return null;
  const animation = (beat.image as { animation?: unknown }).animation;
  if (!MulmoBeatMethods.isAnimationEnabled(animation)) return null;
  const fps = MulmoBeatMethods.isAnimationObject(animation) ? (animation.fps ?? DEFAULT_ANIMATION_FPS) : DEFAULT_ANIMATION_FPS;
  const movie = MulmoBeatMethods.isMovieMode(animation);
  return { fps, movie };
};

const processHtmlTailwindAnimated = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const animConfig = getAnimationConfig(params);
  if (!animConfig) return;

  const duration = params.beatDuration ?? beat.duration;
  if (duration === undefined) {
    throw new Error("html_tailwind animation requires beat.duration or audio-derived duration. Set duration in the beat or ensure audio is generated first.");
  }

  const fps = animConfig.fps;
  // Avoid generating shorter-than-beat animations.
  // floor() can lose up to almost 1 frame, which appears as a pause at beat end.
  const totalFrames = Math.ceil(duration * fps);
  if (totalFrames <= 0) {
    throw new Error(`html_tailwind animation: totalFrames is ${totalFrames} (duration=${duration}, fps=${fps}). Increase duration or fps.`);
  }

  const imageData = beat.image as { html?: string | string[]; script?: string | string[]; elements?: SwipeElement[]; three?: ThreeDslConfig };
  const { html, script } = resolveHtmlAndScript(imageData, context.fileDirs.mulmoFileDirPath);
  const template = getHTMLFile("tailwind_animated");
  const rawHtmlData = interpolate(template, {
    html_body: html,
    animation_runtime: getJSFile("animation_runtime"),
    data_attribute_registration: getJSFile("data_attribute_registration"),
    auto_render: getJSFile("auto_render"),
    user_script: buildUserScript(script),
    totalFrames: String(totalFrames),
    fps: String(fps),
    custom_style: "",
  });
  const resolvedRefs = resolveImageRefs(rawHtmlData, params.imageRefs ?? {});
  const resolvedImages = resolveRelativeImagePaths(resolvedRefs, context.fileDirs.mulmoFileDirPath);
  const htmlData = resolveRelativeModelPathsInScript(resolvedImages, context.fileDirs.mulmoFileDirPath);

  // imagePath is set to the .mp4 path by imagePluginAgent for animated beats
  const videoPath = imagePath;

  if (animConfig.movie) {
    // CDP screencast: real-time recording (experimental, faster)
    await renderHTMLToVideo(htmlData, videoPath, canvasSize.width, canvasSize.height, totalFrames, fps);
  } else {
    // Frame-by-frame screenshot (deterministic, slower)
    const framesDir = videoPath.replace(/\.[^/.]+$/, "_frames");
    fs.mkdirSync(framesDir, { recursive: true });
    try {
      await renderHTMLToFrames(htmlData, framesDir, canvasSize.width, canvasSize.height, totalFrames, fps);
      await framesToVideo(framesDir, videoPath, fps, canvasSize.width, canvasSize.height);
    } finally {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
  }

  return videoPath;
};

const processHtmlTailwindStatic = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const imageData = beat.image as { html?: string | string[]; script?: string | string[]; elements?: SwipeElement[]; three?: ThreeDslConfig };
  const { html, script } = resolveHtmlAndScript(imageData, context.fileDirs.mulmoFileDirPath);
  const template = getHTMLFile("tailwind");
  const rawHtmlData = interpolate(template, {
    html_body: html,
    user_script: buildUserScript(script),
  });
  const resolvedRefs = resolveImageRefs(rawHtmlData, params.imageRefs ?? {});
  const resolvedImages = resolveRelativeImagePaths(resolvedRefs, context.fileDirs.mulmoFileDirPath);
  const htmlData = resolveRelativeModelPathsInScript(resolvedImages, context.fileDirs.mulmoFileDirPath);
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const processHtmlTailwind = async (params: ImageProcessorParams) => {
  const animConfig = getAnimationConfig(params);
  if (animConfig) {
    return processHtmlTailwindAnimated(params);
  }
  return processHtmlTailwindStatic(params);
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  const imageData = beat.image as { html?: string | string[]; elements?: SwipeElement[]; three?: ThreeDslConfig };
  if (imageData.elements && Array.isArray(imageData.elements) && imageData.elements.length > 0) {
    return swipeElementsToHtml(imageData.elements);
  }
  if (imageData.three) {
    return threeDslToHtmlAndScript(imageData.three, params.context.fileDirs.mulmoFileDirPath).html;
  }
  return joinHtml(imageData.html ?? "");
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
