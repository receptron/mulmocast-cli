import fs from "node:fs";
import { ImageProcessorParams } from "../../types/index.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";
import { randomUUID } from "node:crypto";
import nodeProcess from "node:process";
import { getHTMLFile } from "../file.js";
import { interpolate, renderHTMLToFrames, renderHTMLToVideo } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";

export const parrotingImagePath = (params: ImageProcessorParams) => {
  return params.imagePath;
};

export const resolveStyle = (styleName: string | undefined, fallbackStyle: string): string => {
  const customStyle = styleName ? getMarkdownStyle(styleName) : undefined;
  return customStyle ? customStyle.css : fallbackStyle;
};

export const generateUniqueId = (prefix: string): string => {
  if (nodeProcess.env.NODE_ENV === "test") {
    return "id";
  }
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};

export const DEFAULT_ANIMATION_FPS = 30;

type AnimatedRenderParams = {
  htmlBody: string;
  userScript: string;
  fps: number;
  duration: number;
  videoPath: string;
  canvasWidth: number;
  canvasHeight: number;
  customStyle?: string;
  movie?: boolean;
};

/**
 * Validate duration and compute totalFrames for animation rendering.
 */
export const computeTotalFrames = (duration: number, fps: number): number => {
  const totalFrames = Math.floor(duration * fps);
  if (totalFrames <= 0) {
    throw new Error(`Animation: totalFrames is ${totalFrames} (duration=${duration}, fps=${fps}).`);
  }
  return totalFrames;
};

/**
 * Build tailwind_animated HTML from body + script + frame params.
 */
export const buildAnimatedHtml = (htmlBody: string, userScript: string, totalFrames: number, fps: number, customStyle: string = ""): string => {
  const template = getHTMLFile("tailwind_animated");
  return interpolate(template, {
    html_body: htmlBody,
    user_script: userScript,
    totalFrames: String(totalFrames),
    fps: String(fps),
    custom_style: customStyle,
  });
};

/**
 * Render animated HTML to video via frame-by-frame or screencast.
 */
export const renderAnimatedToVideo = async (params: AnimatedRenderParams): Promise<string> => {
  const { htmlBody, userScript, fps, duration, videoPath, canvasWidth, canvasHeight, customStyle, movie } = params;
  const totalFrames = computeTotalFrames(duration, fps);
  const htmlData = buildAnimatedHtml(htmlBody, userScript, totalFrames, fps, customStyle);

  if (movie) {
    await renderHTMLToVideo(htmlData, videoPath, canvasWidth, canvasHeight, totalFrames, fps);
  } else {
    const framesDir = videoPath.replace(/\.[^/.]+$/, "_frames");
    fs.mkdirSync(framesDir, { recursive: true });
    try {
      await renderHTMLToFrames(htmlData, framesDir, canvasWidth, canvasHeight, totalFrames, fps);
      await framesToVideo(framesDir, videoPath, fps, canvasWidth, canvasHeight);
    } finally {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
  }
  return videoPath;
};
