import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";
// Browser reuse disabled by default: with semaphore limiting concurrent renders,
// individual browsers are faster and more stable than sharing pages on one browser.
// Set MULMO_PUPPETEER_REUSE=1 to enable reuse for low-concurrency scenarios.
const reuseBrowser = process.env.MULMO_PUPPETEER_REUSE === "1";
const browserLaunchArgs = isCI ? ["--no-sandbox"] : [];

// Browser idle timeout before closing (ms)
const BROWSER_IDLE_TIMEOUT_MS = 300;
// Default timeout for waiting on async content (ms)
const CONTENT_READY_TIMEOUT_MS = 20000;
// Maximum concurrent Puppeteer render operations (prevents browser overload)
const MAX_CONCURRENT_RENDERS = 4;

// --- Pure utility functions (unit testable) ---

/** Check if HTML contains JavaScript that needs execution time */
export const hasJavaScript = (html: string): boolean => html.includes("<script");

/** Check if HTML contains Chart.js content that needs render time */
export const isChartContent = (html: string): boolean => html.includes("data-chart-ready");

/** Interpolate template variables in a string */
export const interpolate = (template: string, data: Record<string, string>): string => {
  return template.replace(/\$\{(.*?)\}/g, (_, key) => data[key.trim()] ?? "");
};

// --- Shared browser management ---

let sharedBrowserPromise: Promise<puppeteer.Browser> | null = null;
let sharedBrowserRefs = 0;
let sharedBrowserCloseTimer: ReturnType<typeof setTimeout> | null = null;

/** Safely decrement browser reference count */
const decrementBrowserRefs = (): void => {
  sharedBrowserRefs = Math.max(0, sharedBrowserRefs - 1);
};

/** Invalidate the shared browser (called when browser is disconnected or errored) */
const invalidateSharedBrowser = (): void => {
  sharedBrowserPromise = null;
};

/** Acquire a browser instance; reuse a shared one when enabled */
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

  const currentPromise = sharedBrowserPromise;
  try {
    const browser = await currentPromise;

    // Check if browser is still connected; if not, invalidate and retry
    if (!browser.isConnected()) {
      if (sharedBrowserPromise === currentPromise) {
        sharedBrowserPromise = null;
      }
      decrementBrowserRefs();
      return acquireBrowser();
    }

    return browser;
  } catch (error) {
    if (sharedBrowserPromise === currentPromise) {
      sharedBrowserPromise = null;
    }
    decrementBrowserRefs();
    throw error;
  }
};

/** Release the browser; close only after a short idle window */
const releaseBrowser = async (browser: puppeteer.Browser): Promise<void> => {
  if (!reuseBrowser) {
    await browser.close().catch(() => {});
    return;
  }

  decrementBrowserRefs();
  if (sharedBrowserRefs > 0 || !sharedBrowserPromise) {
    return;
  }

  // Delay close to allow back-to-back renders to reuse the browser
  sharedBrowserCloseTimer = setTimeout(async () => {
    const current = sharedBrowserPromise;
    sharedBrowserPromise = null;
    sharedBrowserCloseTimer = null;
    if (current) {
      await (await current).close().catch(() => {});
    }
  }, BROWSER_IDLE_TIMEOUT_MS);
};

// --- Render concurrency control (semaphore) ---
// Limits concurrent Puppeteer operations to prevent browser overload,
// independent of GraphAI's task concurrency which may be higher for API calls.

let activeRenders = 0;
const renderQueue: Array<() => void> = [];

/** Acquire a render slot; waits if max concurrent renders reached */
const acquireRenderSlot = (): Promise<void> =>
  new Promise((resolve) => {
    if (activeRenders < MAX_CONCURRENT_RENDERS) {
      activeRenders++;
      resolve();
    } else {
      renderQueue.push(() => {
        activeRenders++;
        resolve();
      });
    }
  });

/** Release a render slot; allows next queued render to proceed */
const releaseRenderSlot = (): void => {
  activeRenders--;
  const next = renderQueue.shift();
  if (next) {
    next();
  }
};

// --- Page rendering helpers ---

/** Wait for animation frames to let rendering settle */
const waitForFrames = async (page: puppeteer.Page, count: number = 1): Promise<void> => {
  for (let i = 0; i < count; i++) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }
};

/** Wait for mermaid diagram to be ready */
const waitForMermaid = async (page: puppeteer.Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const element = document.querySelector(".mermaid");
      return element && (element as HTMLElement).dataset.ready === "true";
    },
    { timeout: CONTENT_READY_TIMEOUT_MS },
  );
};

/** Wait for Chart.js canvas to be ready */
const waitForChart = async (page: puppeteer.Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas[data-chart-ready='true']");
      return !!canvas;
    },
    { timeout: CONTENT_READY_TIMEOUT_MS },
  );
  // Give the browser a couple of frames to paint the canvas
  await waitForFrames(page, 2);
};

/** Apply scaling to fit content within viewport */
const applyContentScaling = async (page: puppeteer.Page, width: number, height: number): Promise<void> => {
  await page.evaluate(
    ({ vw, vh }) => {
      const body = document.body as HTMLElement;
      const scrollWidth = Math.max(document.documentElement.scrollWidth, body.scrollWidth || 0);
      const scrollHeight = Math.max(document.documentElement.scrollHeight, body.scrollHeight || 0);
      const scale = Math.min(vw / (scrollWidth || vw), vh / (scrollHeight || vh), 1);
      document.documentElement.style.overflow = "hidden";
      if (scale < 1) {
        body.style.transformOrigin = "top left";
        body.style.transform = `scale(${scale})`;
      }
    },
    { vw: width, vh: height },
  );
};

// --- Main rendering functions ---

export const renderHTMLToImage = async (
  html: string,
  outputPath: string,
  width: number,
  height: number,
  isMermaid: boolean = false,
  omitBackground: boolean = false,
) => {
  // Acquire render slot to limit concurrent Puppeteer operations
  await acquireRenderSlot();

  let browser: puppeteer.Browser | null = null;
  let page: puppeteer.Page | null = null;
  let browserErrored = false;

  try {
    browser = reuseBrowser ? await acquireBrowser() : await puppeteer.launch({ args: browserLaunchArgs });
    page = await browser.newPage();
    await page.setViewport({ width, height });

    const jsContent = hasJavaScript(html);
    const chartContent = isChartContent(html);

    // Use networkidle0 for JS-heavy content to wait for all network requests to settle
    await page.setContent(html, { waitUntil: jsContent ? "networkidle0" : "domcontentloaded" });
    await page.addStyleTag({ content: "html,body{height:100%;margin:0;padding:0;overflow:hidden;background:white}" });

    // Wait for async content to be ready
    if (isMermaid) {
      await waitForMermaid(page);
    } else if (chartContent) {
      await waitForChart(page);
    } else if (jsContent) {
      // For other JS content, wait for rendering to stabilize
      await waitForFrames(page, 2);
    }

    // Always wait for layout to stabilize before measuring
    await waitForFrames(page, 1);

    // Scale content to fit viewport if needed
    await applyContentScaling(page, width, height);

    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });
  } catch (error) {
    // Invalidate shared browser on disconnection, timeout, or browser/page closure errors
    if (browser) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      const isFrameDetached = error instanceof Error && error.message.includes("frame was detached");
      const isTargetClosed = error instanceof Error && error.message.includes("Target closed");
      const isBrowserError = isTimeout || isFrameDetached || isTargetClosed;
      if (reuseBrowser && (!browser.isConnected() || isBrowserError)) {
        browserErrored = true;
        invalidateSharedBrowser();
        // Force close the browser if it's in an unstable state
        if (isBrowserError && browser.isConnected()) {
          await browser.close().catch(() => {});
        }
      }
    }
    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      if (reuseBrowser) {
        // If browser errored and was invalidated, don't call releaseBrowser (refs already handled)
        if (!browserErrored) {
          await releaseBrowser(browser);
        } else {
          decrementBrowserRefs();
        }
      } else {
        await browser.close().catch(() => {});
      }
    }
    // Release render slot to allow next queued render to proceed
    releaseRenderSlot();
  }
};

export const renderMarkdownToImage = async (markdown: string, style: string, outputPath: string, width: number, height: number) => {
  const header = `<head><style>${style}</style></head>`;
  const body = await marked(markdown);
  const html = `<html>${header}<body>${body}</body></html>`;
  await renderHTMLToImage(html, outputPath, width, height);
};
