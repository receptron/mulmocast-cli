import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";
const reuseBrowser = process.env.MULMO_PUPPETEER_REUSE !== "0";
const browserLaunchArgs = isCI ? ["--no-sandbox"] : [];

// Shared browser to avoid spawning a new Chromium per render.
let sharedBrowserPromise: Promise<puppeteer.Browser> | null = null;
let sharedBrowserRefs = 0;
let sharedBrowserCloseTimer: ReturnType<typeof setTimeout> | null = null;

// Acquire a browser instance; reuse a shared one when enabled.
const acquireBrowser = async (): Promise<puppeteer.Browser> => {
  if (!reuseBrowser) {
    return await puppeteer.launch({ args: browserLaunchArgs });
  }

  sharedBrowserRefs += 1;
  if (sharedBrowserCloseTimer) {
    clearTimeout(sharedBrowserCloseTimer);
    sharedBrowserCloseTimer = null;
  }

  if (!sharedBrowserPromise) {
    sharedBrowserPromise = puppeteer.launch({ args: browserLaunchArgs });
  }

  try {
    return await sharedBrowserPromise;
  } catch (error) {
    sharedBrowserPromise = null;
    sharedBrowserRefs = Math.max(0, sharedBrowserRefs - 1);
    throw error;
  }
};

// Release the browser; close only after a short idle window.
const releaseBrowser = async (browser: puppeteer.Browser): Promise<void> => {
  if (!reuseBrowser) {
    await browser.close().catch(() => {});
    return;
  }

  sharedBrowserRefs = Math.max(0, sharedBrowserRefs - 1);
  if (sharedBrowserRefs > 0 || !sharedBrowserPromise) {
    return;
  }

  // Delay close to allow back-to-back renders to reuse the browser.
  sharedBrowserCloseTimer = setTimeout(async () => {
    const current = sharedBrowserPromise;
    sharedBrowserPromise = null;
    sharedBrowserCloseTimer = null;
    if (current) {
      await (await current).close().catch(() => {});
    }
  }, 300);
};

const waitForNextFrame = async (page: puppeteer.Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
};

export const renderHTMLToImage = async (
  html: string,
  outputPath: string,
  width: number,
  height: number,
  isMermaid: boolean = false,
  omitBackground: boolean = false,
) => {
  const useSharedBrowser = reuseBrowser && !html.includes("data-chart-ready");
  const browser = useSharedBrowser ? await acquireBrowser() : await puppeteer.launch({ args: browserLaunchArgs });
  const page = await browser.newPage();

  try {
    // Adjust page settings if needed (like width, height, etc.)
    await page.setViewport({ width, height });

    // Set the page content to the HTML generated from the Markdown
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: "html,body{margin:0;padding:0;overflow:hidden}" });

    if (isMermaid) {
      await page.waitForFunction(
        () => {
          const element = document.querySelector(".mermaid");
          return element && (element as HTMLElement).dataset.ready === "true";
        },
        { timeout: 20000 },
      );
    }

    if (html.includes("data-chart-ready")) {
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector("canvas[data-chart-ready='true']");
          return !!canvas;
        },
        { timeout: 20000 },
      );
      // Give the browser a couple of frames to paint the canvas.
      await waitForNextFrame(page);
      await waitForNextFrame(page);
    }

    // Measure the size of the page and scale the page to the width and height
    await page.evaluate(
      ({ vw, vh }) => {
        const documentElement = document.documentElement;
        const scrollWidth = Math.max(documentElement.scrollWidth, document.body.scrollWidth || 0);
        const scrollHeight = Math.max(documentElement.scrollHeight, document.body.scrollHeight || 0);
        const scale = Math.min(vw / (scrollWidth || vw), vh / (scrollHeight || vh), 1); // <=1 で縮小のみ
        documentElement.style.overflow = "hidden";
        (document.body as HTMLElement).style.zoom = String(scale);
      },
      { vw: width, vh: height },
    );

    // Step 3: Capture screenshot of the page (which contains the Markdown-rendered HTML)
    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });
  } finally {
    await page.close().catch(() => {});
    if (useSharedBrowser) {
      await releaseBrowser(browser);
    } else {
      await browser.close().catch(() => {});
    }
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
