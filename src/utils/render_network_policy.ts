import nodePath from "node:path";
import { fileURLToPath } from "node:url";

// What an HTML renderer's page may reach in strict network mode: files under the allowed roots, in-memory
// URLs, and the CDNs our own templates load from. Kept free of I/O so the rules can be tested without a browser.

export const RENDER_CDN_HOSTS = ["cdn.tailwindcss.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];
// jsDelivr serves any file of any package and publishes per-version and per-file hit counts, so a page free to
// choose the path could signal through them; only the exact files our templates load are allowed.
export const RENDER_JSDELIVR_PATHS = [
  "/npm/mermaid/dist/mermaid.min.js",
  "/npm/mermaid@10/dist/mermaid.min.js",
  "/npm/chart.js",
  "/npm/chart.js@4",
  "/npm/chartjs-chart-sankey",
  "/npm/chartjs-chart-treemap@3",
];
const JSDELIVR_HOST = "cdn.jsdelivr.net";
const IN_MEMORY_SCHEMES = ["data:", "blob:", "about:"];

export type RenderNetworkOptions = { strictNetwork?: boolean; allowedFileRoots?: readonly string[] };

export const STRICT_NETWORK_ENV = "MULMO_STRICT_NETWORK";

export const strictNetworkFromEnv = (env: Record<string, string | undefined>): boolean => ["1", "true"].includes(env[STRICT_NETWORK_ENV] ?? "");

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const filePathOf = (parsed: URL): string | undefined => {
  try {
    return fileURLToPath(parsed);
  } catch {
    return undefined;
  }
};

// Resolves symlinks, so a link inside a root cannot reach outside it; undefined when the path does not exist.
export type RealPath = (filePath: string) => string | undefined;

const isWithin = (root: string, filePath: string): boolean => {
  const relative = nodePath.relative(root, filePath);
  return relative === "" || (!relative.startsWith("..") && !nodePath.isAbsolute(relative));
};

// The URL parser has already collapsed dot segments (encoded or not); the roots must already be real paths.
const isInsideFileRoots = (parsed: URL, realRoots: readonly string[], realPath: RealPath): boolean => {
  const filePath = filePathOf(parsed);
  const realFilePath = filePath === undefined ? undefined : realPath(filePath);
  return realFilePath !== undefined && realRoots.some((root) => isWithin(root, realFilePath));
};

const identityRealPath: RealPath = (filePath) => nodePath.resolve(filePath);

const isAllowedCdnUrl = (parsed: URL): boolean => {
  if (parsed.protocol !== "https:" || parsed.port !== "" || !RENDER_CDN_HOSTS.includes(parsed.hostname)) return false;
  return parsed.hostname !== JSDELIVR_HOST || (parsed.search === "" && RENDER_JSDELIVR_PATHS.includes(parsed.pathname));
};

export const isAllowedRenderRequest = (url: string, realRoots: readonly string[] = [], realPath: RealPath = identityRealPath): boolean => {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (IN_MEMORY_SCHEMES.includes(parsed.protocol)) return true;
  if (parsed.protocol === "file:") return isInsideFileRoots(parsed, realRoots, realPath);
  return isAllowedCdnUrl(parsed);
};

// A root that does not exist yet (the temp page before it is written) is its real parent plus its name.
export const realRoot = (root: string, realPath: RealPath): string => {
  const resolved = nodePath.resolve(root);
  const parent = nodePath.dirname(resolved);
  return realPath(resolved) ?? nodePath.join(realPath(parent) ?? parent, nodePath.basename(resolved));
};

// Popups and preconnect hints open connections outside the page's request interception, so the whole browser
// talks through a proxy that does not exist, except for the CDNs (loopback included, which Chromium bypasses by default).
const UNREACHABLE_PROXY = "http://127.0.0.1:1";

export const strictNetworkLaunchArgs = (): string[] => [`--proxy-server=${UNREACHABLE_PROXY}`, `--proxy-bypass-list=${RENDER_CDN_HOSTS.join(";")};<-loopback>`];

// A popup the page writes into gets no evaluateOnNewDocument script, so it would still have WebRTC.
export const POPUP_BLOCK_SCRIPT = 'Object.defineProperty(globalThis, "open", { value: () => null, writable: false, configurable: false });';

// Request interception does not see WebSocket or EventSource connections; this does.
export const RENDER_CONTENT_SECURITY_POLICY = "connect-src 'self' data: blob:";

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${RENDER_CONTENT_SECURITY_POLICY}">`;

// The meta must come before any script and must not precede a doctype (that would switch the page to quirks mode),
// so it goes after <head>, else after <html>, else after the doctype, else first; the parser puts it in the head.
const INSERTION_POINTS = [/<head(\s[^>]*)?>/i, /<html(\s[^>]*)?>/i, /<!doctype[^>]*>/i];

export const withRenderContentSecurityPolicy = (html: string): string => {
  const match = INSERTION_POINTS.map((pattern) => pattern.exec(html)).find((found) => found !== null);
  const insertAt = match ? match.index + match[0].length : 0;
  return [html.slice(0, insertAt), CSP_META, html.slice(insertAt)].join("");
};
