import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";
const reuseBrowser = process.env.MULMO_PUPPETEER_REUSE !== "0";
const browserLaunchArgs = isCI ? ["--no-sandbox"] : [];

// Shared browser to avoid spawning a new Chromium per render.
let sharedBrowserPromise: Promise<puppeteer.Browser> | null = null;
let sharedBrowserRefs = 0;
let sharedBrowserCloseTimer: ReturnType<typeof setTimeout> | null = null;

// Invalidate the shared browser (called when browser is disconnected or errored).
const invalidateSharedBrowser = (): void => {
  sharedBrowserPromise = null;
};

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

  const currentPromise = sharedBrowserPromise;
  try {
    const browser = await currentPromise;

    // Check if browser is still connected; if not, invalidate and retry
    if (!browser.isConnected()) {
      if (sharedBrowserPromise === currentPromise) {
        sharedBrowserPromise = null;
      }
      sharedBrowserRefs -= 1;
      return acquireBrowser();
    }

    return browser;
  } catch (error) {
    if (sharedBrowserPromise === currentPromise) {
      sharedBrowserPromise = null;
    }
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

// Wait for a single animation frame to let canvas paints settle.
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
  // All content types now use shared browser - timing issues resolved with proper waits.
  const useSharedBrowser = reuseBrowser;
  const browser = useSharedBrowser ? await acquireBrowser() : await puppeteer.launch({ args: browserLaunchArgs });
  let page: puppeteer.Page | null = null;
  let browserErrored = false;

  try {
    page = await browser.newPage();
    // Adjust page settings if needed (like width, height, etc.)
    await page.setViewport({ width, height });

    // Determine if HTML contains scripts that need time to execute
    const hasScripts = html.includes("<script");

    // Set the page content to the HTML generated from the Markdown
    // Use networkidle0 for JS-heavy content to wait for all network requests to settle
    await page.setContent(html, { waitUntil: hasScripts ? "networkidle0" : "domcontentloaded" });
    await page.addStyleTag({ content: "html,body{height:100%;margin:0;padding:0;overflow:hidden;background:white}" });

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

    // For any JS content, wait for rendering to stabilize
    if (hasScripts && !isMermaid && !html.includes("data-chart-ready")) {
      await waitForNextFrame(page);
      await waitForNextFrame(page);
    }

    // Always wait for layout to stabilize before measuring
    await waitForNextFrame(page);

    // Measure content and scale only if needed (content larger than viewport)
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
    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });
  } catch (error) {
    // Invalidate shared browser on disconnection or timeout (browser may be hung)
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    if (useSharedBrowser && (!browser.isConnected() || isTimeout)) {
      browserErrored = true;
      invalidateSharedBrowser();
      // Force close the browser if it's hung
      if (isTimeout && browser.isConnected()) {
        await browser.close().catch(() => {});
      }
    }
    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (useSharedBrowser) {
      // If browser errored and was invalidated, don't call releaseBrowser (refs already handled)
      if (!browserErrored) {
        await releaseBrowser(browser);
      } else {
        sharedBrowserRefs = Math.max(0, sharedBrowserRefs - 1);
      }
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
