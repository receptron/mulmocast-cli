import fs from "node:fs";
import type { Page } from "puppeteer";
import { GraphAILogger } from "graphai";
import { WEBRTC_REMOVAL_SCRIPT } from "./remotion/network_policy.js";
import { POPUP_BLOCK_SCRIPT, isAllowedRenderRequest, realRoot, type RealPath } from "./render_network_policy.js";

const fileRealPath: RealPath = (filePath) => {
  try {
    return fs.realpathSync.native(filePath);
  } catch {
    return undefined;
  }
};

// Must run before the page loads anything. The WebRTC removal only reaches documents created after this call,
// which is why strict mode always navigates to a file instead of using setContent.
export const guardRenderPage = async (page: Page, allowedFileRoots: readonly string[]): Promise<void> => {
  const realRoots = allowedFileRoots.map((root) => realRoot(root, fileRealPath));
  const reported = new Set<string>();
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.isInterceptResolutionHandled()) return;
    const url = request.url();
    // The page can close while a request is still pending; that rejection is not a failure of the render.
    if (isAllowedRenderRequest(url, realRoots, fileRealPath)) {
      request.continue().catch(() => undefined);
      return;
    }
    if (!reported.has(url)) {
      reported.add(url);
      GraphAILogger.info(`strict network: blocked ${url}`);
    }
    request.abort("blockedbyclient").catch(() => undefined);
  });
  await page.evaluateOnNewDocument(WEBRTC_REMOVAL_SCRIPT);
  await page.evaluateOnNewDocument(POPUP_BLOCK_SCRIPT);
};
