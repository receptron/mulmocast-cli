//  npx tsx ./test/agents/run_crawler.ts
import { GraphAILogger } from "graphai";
import puppeteerCrawlerAgentInfo from "../../src/agents/puppeteer_crawler_agent";

import test from "node:test";

test("puppeteerCrawlerAgent", async () => {
  const result = await puppeteerCrawlerAgentInfo.agent({ namedInputs: { url: "https://www3.nhk.or.jp/news/html/20250829/k10014907131000.html" } });

  GraphAILogger.info(result);
});
