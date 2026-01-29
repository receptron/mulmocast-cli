import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";
const reuseBrowser = process.env.MULMO_PUPPETEER_REUSE !== "0";
const browserLaunchArgs = isCI ? ["--no-sandbox"] : [];

let sharedBrowserPromise: Promise<puppeteer.Browser> | null = null;
let sharedBrowserRefs = 0;
let sharedBrowserCloseTimer: ReturnType<typeof setTimeout> | null = null;

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

const releaseBrowser = async (browser: puppeteer.Browser): Promise<void> => {
  if (!reuseBrowser) {
    await browser.close().catch(() => {});
    return;
  }

  sharedBrowserRefs = Math.max(0, sharedBrowserRefs - 1);
  if (sharedBrowserRefs > 0 || !sharedBrowserPromise) {
    return;
  }

  sharedBrowserCloseTimer = setTimeout(async () => {
    const current = sharedBrowserPromise;
    sharedBrowserPromise = null;
    sharedBrowserCloseTimer = null;
    if (current) {
      await (await current).close().catch(() => {});
    }
  }, 300);
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
  const browser = await acquireBrowser();
  const page = await browser.newPage();

  try {
    // Set the page content to the HTML generated from the Markdown
    await page.setContent(html);

    // Adjust page settings if needed (like width, height, etc.)
    await page.setViewport({ width, height });
    await page.addStyleTag({ content: "html,body{margin:0;padding:0;overflow:hidden}" });

    if (isMermaid) {
      await page.waitForFunction(
        () => {
          const el = document.querySelector(".mermaid");
          return el && (el as HTMLElement).dataset.ready === "true";
        },
        { timeout: 20000 },
      );
    }

    // Measure the size of the page and scale the page to the width and height
    await page.evaluate(
      ({ vw, vh }) => {
        const de = document.documentElement;
        const sw = Math.max(de.scrollWidth, document.body.scrollWidth || 0);
        const sh = Math.max(de.scrollHeight, document.body.scrollHeight || 0);
        const scale = Math.min(vw / (sw || vw), vh / (sh || vh), 1); // <=1 で縮小のみ
        de.style.overflow = "hidden";
        (document.body as HTMLElement).style.zoom = String(scale);
      },
      { vw: width, vh: height },
    );

    // Step 3: Capture screenshot of the page (which contains the Markdown-rendered HTML)
    await page.screenshot({ path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`, omitBackground });
  } finally {
    await page.close().catch(() => {});
    await releaseBrowser(browser);
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
