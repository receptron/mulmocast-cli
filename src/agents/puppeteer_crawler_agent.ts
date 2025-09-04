import { AgentFunction, AgentFunctionInfo, GraphAILogger } from "graphai";
import puppeteer from "puppeteer";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

type Article = {
  url: string;
  title: string | null;
  byline: string | null;
  excerpt: string | null;
  length: number | null;
  textContent: string | null;
};

const NAV_TIMEOUT = 45_000;

const normalize = (s: string) =>
  s
    .replace(/\r\n/g, "\n")
    .replace(/[\n\t]{2,}/g, "\n")
    .trim();

const waitStable = async (page: puppeteer.Page, ms = 1200, step = 200) => {
  let last = -1;
  let stable = 0;
  while (stable < ms) {
    const len = await page.evaluate(() => document.body?.innerText?.length || 0);
    stable = len === last ? stable + step : 0;
    last = len;
    await new Promise((r) => setTimeout(r, step));
  }
};

const fetchArticle = async (url: string): Promise<Article> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1366, height: 900 });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });

    await Promise.race([page.waitForSelector("article, main, [role=main], .article, .post", { timeout: 8000 }), new Promise((r) => setTimeout(r, 8000))]);

    await waitStable(page, 1200);

    const html = await page.content();
    const dom = new JSDOM(html, { url: page.url() });
    const reader = new Readability(dom.window.document);
    const a = reader.parse();

    const title = a?.title || (await page.title()) || null;
    const text = normalize(a?.textContent || "");

    let finalText = text;
    if (finalText.length < 100) {
      const raw = await page.evaluate(() => {
        const el = document.querySelector("article, main, [role=main], .article, .post") || document.body;
        return el?.textContent || "";
      });
      finalText = normalize(raw);
    }

    return {
      url,
      title,
      byline: a?.byline || null,
      excerpt: a?.excerpt || null,
      length: a?.length ?? (finalText?.length || null),
      textContent: finalText || null,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
};

export const puppeteerCrawlerAgent: AgentFunction = async ({ namedInputs }) => {
  const { url } = namedInputs;
  GraphAILogger.log(url);

  try {
    const data = await fetchArticle(url);
    GraphAILogger.log(JSON.stringify({ ok: true, ...data }));
    return {
      data,
      content: data.textContent,
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);

    GraphAILogger.log(JSON.stringify({ ok: false, url, error: errorMessage }));
    return { content: errorMessage };
  }
};

const puppeteerCrawlerAgentInfo: AgentFunctionInfo = {
  name: "puppeteerCrawlerAgent",
  agent: puppeteerCrawlerAgent,
  mock: puppeteerCrawlerAgent,
  samples: [
    {
      params: {},
      inputs: {},
      result: {},
    },
  ],
  description: "Puppeteer Crawler Agent",
  category: ["net"],
  repository: "https://github.com/receptron/mulmocast-cli",
  author: "Receptron team",
  license: "MIT",
};

export default puppeteerCrawlerAgentInfo;
