import fs from "node:fs";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoBeatMethods } from "../../methods/mulmo_beat.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate, renderHTMLToFrames } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "html_tailwind";

const getAnimationConfig = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return null;
  const animation = (beat.image as { animation?: unknown }).animation;
  if (!MulmoBeatMethods.isAnimationEnabled(animation)) return null;
  if (animation === true) return { fps: 30 };
  return { fps: (animation as { fps?: number }).fps ?? 30 };
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

  const html = Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;
  const template = getHTMLFile("tailwind_animated");
  const htmlData = interpolate(template, {
    html_body: html,
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

  const html = Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;
  const template = getHTMLFile("tailwind");
  const htmlData = interpolate(template, {
    html_body: html,
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
  return Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
