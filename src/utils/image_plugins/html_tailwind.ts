import fs from "node:fs";
import nodePath from "node:path";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoBeatMethods } from "../../methods/mulmo_beat.js";
import { getHTMLFile, getJSFile } from "../file.js";
import { renderHTMLToImage, interpolate, renderHTMLToFrames, renderHTMLToVideo, renderHTMLToFinalFrame } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";
import { parrotingImagePath } from "./utils.js";
import { swipeElementsToHtml, swipeElementsToScript, type SwipeElement } from "../swipe_to_html.js";

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
 * Resolve movie:name references to file:// absolute paths using movieRefs.
 * e.g., src="movie:office_pan" → src="file:///abs/path/to/office_pan.mp4"
 */
export const resolveMovieRefs = (html: string, movieRefs: Record<string, string>): string => {
  return html.replace(/(\bsrc\s*=\s*)(["'])movie:([^"']+)\2/gi, (match, prefix, quote, name) => {
    const resolvedPath = movieRefs[name];
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
  return html.replace(/(\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (_, prefix, quote, pathValue) => {
    const isAbsoluteLike =
      pathValue.startsWith("http://") ||
      pathValue.startsWith("https://") ||
      pathValue.startsWith("file://") ||
      pathValue.startsWith("data:") ||
      pathValue.startsWith("image:") ||
      pathValue.startsWith("/");
    if (isAbsoluteLike) return `${prefix}${quote}${pathValue}${quote}`;

    const absolutePath = nodePath.resolve(baseDirPath, pathValue);
    return `${prefix}${quote}file://${absolutePath}${quote}`;
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
  const isModule = code.split("\n").some((line) => {
    const trimmed = line.trimStart();
    return trimmed.startsWith("import ") || trimmed.startsWith("export ");
  });
  return isModule ? `<script type="module">\n${code}\n</script>` : `<script>\n${code}\n</script>`;
};

/**
 * Resolve relative modelUrl assignment in user scripts to file:// absolute paths.
 * e.g. const modelUrl = "models/a.glb" -> const modelUrl = "file:///abs/models/a.glb"
 */
export const resolveRelativeModelPathsInScript = (html: string, baseDirPath: string): string => {
  const lines = html.split("\n");
  return lines
    .map((line) => {
      const hasModelDeclaration = line.includes("modelUrl") && (line.includes("const ") || line.includes("let ") || line.includes("var "));
      if (!hasModelDeclaration || !line.includes("=")) return line;

      const eqIndex = line.indexOf("=");
      const afterEq = line.slice(eqIndex + 1);
      const singleQuoteIndex = afterEq.indexOf("'");
      const doubleQuoteIndex = afterEq.indexOf('"');
      const quoteIndex = singleQuoteIndex >= 0 && (doubleQuoteIndex < 0 || singleQuoteIndex < doubleQuoteIndex) ? singleQuoteIndex : doubleQuoteIndex;
      if (quoteIndex < 0) return line;

      const quoteChar = afterEq[quoteIndex];
      const start = eqIndex + 1 + quoteIndex;
      const end = line.indexOf(quoteChar, start + 1);
      if (end < 0) return line;

      const rawPath = line.slice(start + 1, end);
      const isAbsoluteLike =
        rawPath.startsWith("http://") ||
        rawPath.startsWith("https://") ||
        rawPath.startsWith("file://") ||
        rawPath.startsWith("data:") ||
        rawPath.startsWith("/");
      if (isAbsoluteLike) return line;

      const absolutePath = nodePath.resolve(baseDirPath, rawPath);
      return `${line.slice(0, start + 1)}file://${absolutePath}${line.slice(end)}`;
    })
    .join("\n");
};

/**
 * Resolve HTML and script from beat image data.
 * If `elements` (Swipe-style) is provided, convert to HTML + script.
 * Otherwise, use raw `html` and `script` fields.
 */
const resolveHtmlAndScript = (imageData: {
  html?: string | string[];
  script?: string | string[];
  elements?: SwipeElement[];
}): { html: string; script: string | string[] | undefined } => {
  if (imageData.elements && Array.isArray(imageData.elements) && imageData.elements.length > 0) {
    const html = swipeElementsToHtml(imageData.elements);
    const generatedScript = swipeElementsToScript(imageData.elements);
    // Merge with user-provided script if any
    const userScript = imageData.script ? joinHtml(imageData.script as string | string[]) : "";
    const combinedScript = [generatedScript, userScript].filter(Boolean).join("\n");
    return { html, script: combinedScript || undefined };
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

/** Large frame count to ensure all animations reach their end state when exact duration is unknown */
const FINAL_FRAME_TOTAL = 9000;

/**
 * Build the animated HTML string from beat data and template.
 */
const buildAnimatedHtml = (params: ImageProcessorParams, totalFrames: number, fps: number): string => {
  const { beat, context } = params;
  const imageData = beat.image as { html?: string | string[]; script?: string | string[]; elements?: SwipeElement[] };
  const { html, script } = resolveHtmlAndScript(imageData);
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
  const resolvedImageRefs = resolveImageRefs(rawHtmlData, params.imageRefs ?? {});
  const resolvedAllRefs = resolveMovieRefs(resolvedImageRefs, params.movieRefs ?? {});
  const resolvedImages = resolveRelativeImagePaths(resolvedAllRefs, context.fileDirs.mulmoFileDirPath);
  return resolveRelativeModelPathsInScript(resolvedImages, context.fileDirs.mulmoFileDirPath);
};

const processHtmlTailwindAnimated = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const animConfig = getAnimationConfig(params);
  if (!animConfig) return;

  const duration = params.beatDuration ?? beat.duration;
  const fps = animConfig.fps;

  // Generate video if duration is available
  if (duration !== undefined) {
    const totalFrames = Math.floor(duration * fps);
    if (totalFrames <= 0) {
      throw new Error(`html_tailwind animation: totalFrames is ${totalFrames} (duration=${duration}, fps=${fps}). Increase duration or fps.`);
    }

    const htmlData = buildAnimatedHtml(params, totalFrames, fps);
    // imagePath is set to the .mp4 path by imagePluginAgent for animated beats
    const videoPath = imagePath;

    if (animConfig.movie) {
      await renderHTMLToVideo(htmlData, videoPath, canvasSize.width, canvasSize.height, totalFrames, fps);
    } else {
      const framesDir = videoPath.replace(/\.[^/.]+$/, "_frames");
      fs.mkdirSync(framesDir, { recursive: true });
      try {
        await renderHTMLToFrames(htmlData, framesDir, canvasSize.width, canvasSize.height, totalFrames, fps);
        await framesToVideo(framesDir, videoPath, fps, canvasSize.width, canvasSize.height);
      } finally {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    }
  }

  // Generate a high-quality static image of the final frame for PDF/thumbnail use.
  // Uses a large totalFrames so all animations are guaranteed to reach their end state,
  // even when exact duration is unknown (e.g., PDF generation without audio).
  const finalFramePath = imagePath.replace(/_animated\.mp4$/, ".png");
  const finalHtml = buildAnimatedHtml(params, FINAL_FRAME_TOTAL, fps);
  await renderHTMLToFinalFrame(finalHtml, finalFramePath, canvasSize.width, canvasSize.height);

  // Return video path when video was generated, otherwise return the static PNG path
  return duration !== undefined ? imagePath : finalFramePath;
};

const processHtmlTailwindStatic = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const imageData = beat.image as { html?: string | string[]; script?: string | string[]; elements?: SwipeElement[] };
  const { html, script } = resolveHtmlAndScript(imageData);
  const template = getHTMLFile("tailwind");
  const rawHtmlData = interpolate(template, {
    html_body: html,
    user_script: buildUserScript(script),
  });
  const resolvedImageRefs = resolveImageRefs(rawHtmlData, params.imageRefs ?? {});
  const resolvedAllRefs = resolveMovieRefs(resolvedImageRefs, params.movieRefs ?? {});
  const resolvedImages = resolveRelativeImagePaths(resolvedAllRefs, context.fileDirs.mulmoFileDirPath);
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
  const imageData = beat.image as { html?: string | string[]; elements?: SwipeElement[] };
  if (imageData.elements && Array.isArray(imageData.elements) && imageData.elements.length > 0) {
    return swipeElementsToHtml(imageData.elements);
  }
  return joinHtml(imageData.html ?? "");
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
