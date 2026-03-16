import fs from "node:fs";
import os from "node:os";
import nodePath from "node:path";
import crypto from "node:crypto";
import { marked } from "marked";
import puppeteer from "puppeteer";

import { GraphAILogger } from "graphai";

const isCI = process.env.CI === "true";

const VIDEO_LOAD_TIMEOUT_MS = 15000;
const VIDEO_SEEK_TIMEOUT_MS = 3000;

/** Wait for all <video> elements on the page to be ready for playback */
const waitForVideosReady = async (page: puppeteer.Page): Promise<void> => {
  const hasVideos = await page.evaluate(() => document.querySelectorAll("video").length > 0);
  if (!hasVideos) return;

  GraphAILogger.info("Waiting for video elements to load...");
  await page.evaluate((timeout_ms) => {
    const videos = Array.from(document.querySelectorAll("video"));
    const pending = videos.filter((v) => v.readyState < 3);
    if (pending.length === 0) return Promise.resolve();

    /* eslint-disable sonarjs/no-nested-functions -- inside page.evaluate serialization boundary */
    return new Promise<void>((resolve) => {
      let remaining = pending.length;
      const timer = setTimeout(() => resolve(), timeout_ms);
      pending.forEach((v) =>
        v.addEventListener(
          "canplaythrough",
          () => {
            remaining--;
            if (remaining <= 0) {
              clearTimeout(timer);
              resolve();
            }
          },
          { once: true },
        ),
      );
    });
    /* eslint-enable sonarjs/no-nested-functions */
  }, VIDEO_LOAD_TIMEOUT_MS);
};

/** Seek all <video> elements to the specified frame time and wait for seek to complete */
const syncVideosToFrame = async (page: puppeteer.Page, frameIndex: number, fps: number): Promise<void> => {
  const time = frameIndex / fps;
  await page.evaluate(
    (seekTime, seekTimeout) => {
      const videos = Array.from(document.querySelectorAll("video"));
      if (videos.length === 0) return;
      videos.forEach((v) => {
        v.pause();
        v.currentTime = seekTime;
      });
      /* eslint-disable sonarjs/no-nested-functions -- unavoidable inside page.evaluate serialization boundary */
      return Promise.all(
        videos.map(
          (v) =>
            new Promise<void>((r) => {
              const timer = setTimeout(() => r(), seekTimeout);
              v.addEventListener(
                "seeked",
                () => {
                  clearTimeout(timer);
                  r();
                },
                { once: true },
              );
            }),
        ),
      );
      /* eslint-enable sonarjs/no-nested-functions */
    },
    time,
    VIDEO_SEEK_TIMEOUT_MS,
  );
};

/** Scale the page content so it fits inside the viewport without overflow */
const scaleContentToFit = async (page: puppeteer.Page, viewportWidth: number, viewportHeight: number): Promise<void> => {
  await page.evaluate(
    ({ targetWidth, targetHeight }) => {
      const docElement = document.documentElement;
      const scrollWidth = Math.max(docElement.scrollWidth, document.body.scrollWidth || 0);
      const scrollHeight = Math.max(docElement.scrollHeight, document.body.scrollHeight || 0);
      const scale = Math.min(targetWidth / (scrollWidth || targetWidth), targetHeight / (scrollHeight || targetHeight), 1);
      docElement.style.overflow = "hidden";
      (document.body as HTMLElement).style.zoom = String(scale);
    },
    { targetWidth: viewportWidth, targetHeight: viewportHeight },
  );
};

/** Determine the appropriate waitUntil strategy based on HTML content */
const resolveWaitUntil = (html: string): "networkidle0" | "load" | "domcontentloaded" => {
  const hasExternalImages = html.includes("<img") && /src=["']https?:\/\//.test(html);
  const hasLocalImages = html.includes("<img") && /src=["']file:\/\//.test(html);
  if (hasExternalImages) return "networkidle0";
  if (hasLocalImages) return "load";
  return "domcontentloaded";
};

/**
 * Load HTML into a Puppeteer page.
 * When the HTML references file:// URLs, write it to a temp file
 * and navigate via page.goto (setContent uses about:blank origin
 * which blocks file:// loading).
 */
const loadHtmlIntoPage = async (page: puppeteer.Page, html: string, timeout_ms: number): Promise<void> => {
  const waitUntil = resolveWaitUntil(html);
  const hasFileUrls = /file:\/\//.test(html);

  if (hasFileUrls) {
    const tmpFile = nodePath.join(os.tmpdir(), `mulmocast_render_${crypto.randomUUID()}.html`);
    fs.writeFileSync(tmpFile, html);
    try {
      await page.goto(`file://${tmpFile}`, { waitUntil, timeout: timeout_ms });
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        /* ignore cleanup errors */
      }
    }
  } else {
    await page.setContent(html, { waitUntil, timeout: timeout_ms });
  }
};

export const renderHTMLToImage = async (
  html: string,
  outputPath: string,
  width: number,
  height: number,
  isMermaid: boolean = false,
  omitBackground: boolean = false,
) => {
  // Use Puppeteer to render HTML to an image
  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox", "--allow-file-access-from-files"] : ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();

    await loadHtmlIntoPage(page, html, 30000);

    // Adjust page settings if needed (like width, height, etc.)
    await page.setViewport({ width, height });
    // height:100% ensures background fills viewport; only reset html, let body styles come from custom CSS
    await page.addStyleTag({ content: "html{height:100%;margin:0;padding:0;overflow:hidden}" });

    if (isMermaid) {
      // Wait for mermaid library to load from CDN
      await page.waitForFunction(() => typeof (window as unknown as { mermaid: unknown }).mermaid !== "undefined", { timeout: 20000 });
      // Wait until all mermaid elements have SVG rendered
      await page.waitForFunction(
        () => {
          const elements = document.querySelectorAll(".mermaid");
          if (elements.length === 0) return true;
          return Array.from(elements).every((el) => el.querySelector("svg") !== null);
        },
        { timeout: 20000 },
      );
    }

    // Wait for Chart.js to finish rendering if this is a chart
    if (html.includes("data-chart-ready")) {
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector("canvas[data-chart-ready='true']");
          return !!canvas;
        },
        { timeout: 20000 },
      );
    }

    // Measure the size of the page and scale the page to the width and height
    await scaleContentToFit(page, width, height);

    // Capture screenshot of the page (which contains the Markdown-rendered HTML)
    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });
  } finally {
    await browser.close();
  }
};

/**
 * Render an animated HTML page frame-by-frame using Puppeteer.
 *
 * For each frame:
 *   1. Update window.__MULMO.frame
 *   2. Call render(frame, totalFrames, fps) — awaits if it returns a Promise
 *   3. Take a screenshot
 *
 * The user-defined render() function may be sync or async.
 */
export const renderHTMLToFrames = async (
  html: string,
  outputDir: string,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
): Promise<string[]> => {
  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox", "--allow-file-access-from-files"] : ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();

    // Wait for Tailwind CSS CDN to load
    await loadHtmlIntoPage(page, html, 30000);
    await page.setViewport({ width, height });
    await page.addStyleTag({ content: "html{height:100%;margin:0;padding:0;overflow:hidden}" });

    // Scale content to fit viewport (same logic as renderHTMLToImage)
    await scaleContentToFit(page, width, height);
    await waitForVideosReady(page);

    const framePaths: string[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      // Update frame state and call render() — await in case it returns a Promise
      // Update frame state and call render()
      await page.evaluate(
        async ({ frameIndex, totalFrameCount, framesPerSecond }) => {
          const mulmoWindow = window as unknown as { __MULMO: { frame: number }; render?: (f: number, t: number, fps: number) => unknown };
          mulmoWindow.__MULMO.frame = frameIndex;
          if (typeof mulmoWindow.render === "function") {
            await mulmoWindow.render(frameIndex, totalFrameCount, framesPerSecond);
          }
        },
        { frameIndex: frame, totalFrameCount: totalFrames, framesPerSecond: fps },
      );
      // Sync all <video> elements to the current frame time
      await syncVideosToFrame(page, frame, fps);

      const framePath = nodePath.join(outputDir, `frame_${String(frame).padStart(5, "0")}.png`);
      await page.screenshot({ path: framePath as `${string}.png` });
      framePaths.push(framePath);
    }

    return framePaths;
  } finally {
    await browser.close();
  }
};

/**
 * Record an animated HTML page as video using Puppeteer's screencast API.
 * The animation plays in real-time via requestAnimationFrame, and
 * page.screencast() captures frames directly to an mp4 file.
 */
export const renderHTMLToVideo = async (html: string, videoPath: string, width: number, height: number, totalFrames: number, fps: number): Promise<void> => {
  const duration_ms = (totalFrames / fps) * 1000;
  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox", "--allow-file-access-from-files"] : ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await loadHtmlIntoPage(page, html, 30000);
    await page.setViewport({ width, height });
    await page.addStyleTag({ content: "html{height:100%;margin:0;padding:0;overflow:hidden}" });
    await scaleContentToFit(page, width, height);
    await waitForVideosReady(page);

    // Reset all videos to start and begin playback
    await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll("video"));
      return Promise.all(
        videos.map((v) => {
          v.muted = true;
          v.currentTime = 0;
          return v.play().catch(() => {});
        }),
      );
    });

    const recorder = await page.screencast({
      path: videoPath as `${string}.mp4`,
      format: "mp4",
      fps,
    });

    // Play animation in real-time and wait for completion
    await page.evaluate(() => {
      return (window as unknown as { playAnimation: () => Promise<void> }).playAnimation();
    });

    // Small buffer to ensure the last frame is captured
    await new Promise((resolve) => setTimeout(resolve, Math.min(duration_ms * 0.1, 500)));

    await recorder.stop();
  } finally {
    await browser.close();
  }
};

/**
 * Render the final frame of an animated HTML page as a static image.
 * Loads the animated HTML, calls window.renderFinal() to set all animations
 * to their end state, then takes a screenshot. Used for PDF/thumbnail generation.
 */
export const renderHTMLToFinalFrame = async (html: string, outputPath: string, width: number, height: number): Promise<void> => {
  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox", "--allow-file-access-from-files"] : ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await loadHtmlIntoPage(page, html, 30000);
    await page.setViewport({ width, height });
    await page.addStyleTag({ content: "html{height:100%;margin:0;padding:0;overflow:hidden}" });
    await scaleContentToFit(page, width, height);
    await waitForVideosReady(page);

    // Render the final frame (all animations at end state)
    await page.evaluate(async () => {
      const w = window as unknown as { renderFinal?: () => unknown };
      if (typeof w.renderFinal === "function") {
        await Promise.resolve(w.renderFinal());
      }
    });

    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp` });
  } finally {
    await browser.close();
  }
};

export const renderMarkdownToImage = async (markdown: string, style: string, outputPath: string, width: number, height: number) => {
  const header = `<head><style>${style}</style></head>`;
  const body = await marked(markdown);
  const html = `<html>${header}<body>${body}</body></html>`;
  await renderHTMLToImage(html, outputPath, width, height);
};

export const interpolate = (template: string, data: Record<string, string>): string => {
  return template.replace(/\$\{(.*?)\}/g, (_, key) => data[key.trim()] ?? "");
};
