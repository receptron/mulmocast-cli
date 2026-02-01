import { marked } from "marked";
import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";

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
    args: isCI ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage();

  // Set the page content to the HTML generated from the Markdown
  // Use networkidle0 only for external images, otherwise use domcontentloaded for faster rendering
  // Only match <img> tags with external src, not <script> tags
  const hasExternalImages = /<img[^>]+src=["']https?:\/\//.test(html);
  const waitUntil = hasExternalImages ? "networkidle0" : "domcontentloaded";
  await page.setContent(html, { waitUntil, timeout: 30000 });

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

export const renderMarkdownToImage = async (markdown: string, style: string, outputPath: string, width: number, height: number) => {
  const header = `<head><style>${style}</style></head>`;
  const body = await marked(markdown);
  const html = `<html>${header}<body>${body}</body></html>`;
  await renderHTMLToImage(html, outputPath, width, height);
};

export const interpolate = (template: string, data: Record<string, string>): string => {
  return template.replace(/\$\{(.*?)\}/g, (_, key) => data[key.trim()] ?? "");
};
