import fs from "node:fs";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoBeatMethods } from "../../methods/mulmo_beat.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate, renderHTMLToFrames } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "html_tailwind";

const DEFAULT_ANIMATION_FPS = 30;

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
  if (MulmoBeatMethods.isAnimationObject(animation)) return { fps: animation.fps ?? DEFAULT_ANIMATION_FPS };
  return { fps: DEFAULT_ANIMATION_FPS };
};

const processHtmlTailwindAnimated = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const animConfig = getAnimationConfig(params);
  if (!animConfig) return;

  const duration = beat.duration;
  if (duration === undefined) {
    throw new Error("html_tailwind animation requires explicit beat.duration. Set duration in the beat definition.");
  }

  const fps = animConfig.fps;
  const totalFrames = Math.floor(duration * fps);
  if (totalFrames <= 0) {
    throw new Error(`html_tailwind animation: totalFrames is ${totalFrames} (duration=${duration}, fps=${fps}). Increase duration or fps.`);
  }

  const html = joinHtml(beat.image.html);
  const template = getHTMLFile("tailwind_animated");
  const script = "script" in beat.image ? (beat.image as { script?: string | string[] }).script : undefined;
  const htmlData = interpolate(template, {
    html_body: html,
    user_script: buildUserScript(script),
    totalFrames: String(totalFrames),
    fps: String(fps),
    custom_style: "",
  });

  // imagePath is set to the .mp4 path by imagePluginAgent for animated beats
  const videoPath = imagePath;

  // Create frames directory next to the video file
  const framesDir = videoPath.replace(/\.[^/.]+$/, "_frames");
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    await renderHTMLToFrames(htmlData, framesDir, canvasSize.width, canvasSize.height, totalFrames, fps);
    await framesToVideo(framesDir, videoPath, fps, canvasSize.width, canvasSize.height);
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }

  return videoPath;
};

const processHtmlTailwindStatic = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = joinHtml(beat.image.html);
  const template = getHTMLFile("tailwind");
  const script = "script" in beat.image ? (beat.image as { script?: string | string[] }).script : undefined;
  const htmlData = interpolate(template, {
    html_body: html,
    user_script: buildUserScript(script),
  });
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
