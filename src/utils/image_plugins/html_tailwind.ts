import nodePath from "node:path";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoBeatMethods } from "../../methods/mulmo_beat.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, DEFAULT_ANIMATION_FPS, renderAnimatedToVideo } from "./utils.js";

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

/** Join html field into a single string (handles both string and string[]) */
const joinHtml = (html: string | string[]): string => {
  return Array.isArray(html) ? html.join("\n") : html;
};

const buildUserScript = (script: string | string[] | undefined): string => {
  if (!script) return "";
  const code = Array.isArray(script) ? script.join("\n") : script;
  return `<script>\n${code}\n</script>`;
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

  const html = joinHtml(beat.image.html);
  const script = "script" in beat.image ? (beat.image as { script?: string | string[] }).script : undefined;
  const rawHtmlBody = resolveImageRefs(html, params.imageRefs ?? {});
  const htmlBody = resolveRelativeImagePaths(rawHtmlBody, context.fileDirs.mulmoFileDirPath);

  return renderAnimatedToVideo({
    htmlBody,
    userScript: buildUserScript(script),
    fps: animConfig.fps,
    duration,
    videoPath: imagePath,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    movie: animConfig.movie,
  });
};

const processHtmlTailwindStatic = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = joinHtml(beat.image.html);
  const template = getHTMLFile("tailwind");
  const script = "script" in beat.image ? (beat.image as { script?: string | string[] }).script : undefined;
  const rawHtmlData = interpolate(template, {
    html_body: html,
    user_script: buildUserScript(script),
  });
  const resolvedRefs = resolveImageRefs(rawHtmlData, params.imageRefs ?? {});
  const htmlData = resolveRelativeImagePaths(resolvedRefs, context.fileDirs.mulmoFileDirPath);
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
  return joinHtml(beat.image.html);
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
