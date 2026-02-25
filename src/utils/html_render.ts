import fs from "node:fs";
import os from "node:os";
import nodePath from "node:path";
import crypto from "node:crypto";
import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";

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
  await page.evaluate(
    ({ viewportWidth, viewportHeight }) => {
      const docElement = document.documentElement;
      const scrollWidth = Math.max(docElement.scrollWidth, document.body.scrollWidth || 0);
      const scrollHeight = Math.max(docElement.scrollHeight, document.body.scrollHeight || 0);
      const scale = Math.min(viewportWidth / (scrollWidth || viewportWidth), viewportHeight / (scrollHeight || viewportHeight), 1);
      docElement.style.overflow = "hidden";
      (document.body as HTMLElement).style.zoom = String(scale);
    },
    { viewportWidth: width, viewportHeight: height },
  );

  // Step 3: Capture screenshot of the page (which contains the Markdown-rendered HTML)
  await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });

  await browser.close();
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
  const page = await browser.newPage();

  // Wait for Tailwind CSS CDN to load
  await loadHtmlIntoPage(page, html, 30000);
  await page.setViewport({ width, height });
  await page.addStyleTag({ content: "html{height:100%;margin:0;padding:0;overflow:hidden}" });

  // Scale content to fit viewport (same logic as renderHTMLToImage)
  await page.evaluate(
    ({ viewportWidth, viewportHeight }) => {
      const docElement = document.documentElement;
      const scrollWidth = Math.max(docElement.scrollWidth, document.body.scrollWidth || 0);
      const scrollHeight = Math.max(docElement.scrollHeight, document.body.scrollHeight || 0);
      const scale = Math.min(viewportWidth / (scrollWidth || viewportWidth), viewportHeight / (scrollHeight || viewportHeight), 1);
      docElement.style.overflow = "hidden";
      (document.body as HTMLElement).style.zoom = String(scale);
    },
    { viewportWidth: width, viewportHeight: height },
  );

  const framePaths: string[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    // Update frame state and call render() — await in case it returns a Promise
    await page.evaluate(
      async ({ f, total, fpsVal }) => {
        const w = window as unknown as { __MULMO: { frame: number }; render?: (f: number, t: number, fps: number) => unknown };
        w.__MULMO.frame = f;
        if (typeof w.render === "function") {
          await w.render(f, total, fpsVal);
        }
      },
      { f: frame, total: totalFrames, fpsVal: fps },
    );

    const framePath = nodePath.join(outputDir, `frame_${String(frame).padStart(5, "0")}.png`);
    await page.screenshot({ path: framePath as `${string}.png` });
    framePaths.push(framePath);
  }

  await browser.close();
  return framePaths;
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
