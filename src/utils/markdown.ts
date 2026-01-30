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
