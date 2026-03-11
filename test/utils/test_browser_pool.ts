import test from "node:test";
import assert from "node:assert";
import { getBrowser, closeBrowser } from "../../src/utils/browser_pool.js";

test("getBrowser returns a connected browser", async () => {
  const browser = await getBrowser();
  assert(browser.connected, "Browser should be connected");
  await closeBrowser();
});

test("getBrowser returns the same instance on multiple calls", async () => {
  const browser1 = await getBrowser();
  const browser2 = await getBrowser();
  assert.strictEqual(browser1, browser2, "Should return the same browser instance");
  await closeBrowser();
});

test("closeBrowser disconnects the browser", async () => {
  const browser = await getBrowser();
  assert(browser.connected, "Browser should be connected before close");
  await closeBrowser();
  assert(!browser.connected, "Browser should be disconnected after close");
});

test("getBrowser creates a new instance after closeBrowser", async () => {
  const browser1 = await getBrowser();
  await closeBrowser();
  const browser2 = await getBrowser();
  assert.notStrictEqual(browser1, browser2, "Should create a new browser instance after close");
  assert(browser2.connected, "New browser should be connected");
  await closeBrowser();
});

test("multiple concurrent getBrowser calls return the same instance", async () => {
  const [browser1, browser2, browser3] = await Promise.all([getBrowser(), getBrowser(), getBrowser()]);
  assert.strictEqual(browser1, browser2, "Concurrent calls should return the same instance");
  assert.strictEqual(browser2, browser3, "Concurrent calls should return the same instance");
  await closeBrowser();
});

test("newPage creates independent pages on shared browser", async () => {
  const browser = await getBrowser();
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();
  assert.notStrictEqual(page1, page2, "Pages should be different instances");

  await page1.setContent("<h1>Page 1</h1>");
  await page2.setContent("<h1>Page 2</h1>");

  // eslint-disable-next-line no-undef
  const text1 = await page1.evaluate(() => document.body.textContent);
  // eslint-disable-next-line no-undef
  const text2 = await page2.evaluate(() => document.body.textContent);
  assert.strictEqual(text1, "Page 1");
  assert.strictEqual(text2, "Page 2");

  await page1.close();
  await page2.close();
  await closeBrowser();
});
