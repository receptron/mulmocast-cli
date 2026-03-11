import puppeteer from "puppeteer";

const isCI = process.env.CI === "true";

const launchArgs = isCI ? ["--no-sandbox", "--allow-file-access-from-files"] : ["--allow-file-access-from-files"];

let browserInstance: puppeteer.Browser | null = null;
let launchPromise: Promise<puppeteer.Browser> | null = null;

const launchBrowser = async (): Promise<puppeteer.Browser> => {
  const browser = await puppeteer.launch({ args: launchArgs });
  browser.on("disconnected", () => {
    browserInstance = null;
    launchPromise = null;
  });
  return browser;
};

/** Get a shared browser instance. Launches one if none exists. */
export const getBrowser = async (): Promise<puppeteer.Browser> => {
  if (browserInstance?.connected) {
    return browserInstance;
  }
  // Prevent multiple concurrent launches
  if (!launchPromise) {
    launchPromise = launchBrowser().then((browser) => {
      browserInstance = browser;
      launchPromise = null;
      return browser;
    });
  }
  return launchPromise;
};

/** Close the shared browser instance. Call at the end of processing. */
export const closeBrowser = async (): Promise<void> => {
  if (launchPromise) {
    await launchPromise;
  }
  if (browserInstance?.connected) {
    await browserInstance.close();
  }
  browserInstance = null;
  launchPromise = null;
};
