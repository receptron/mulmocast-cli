import nodePath from "node:path";
import { fileURLToPath } from "node:url";

// What an HTML renderer's page may reach in strict network mode: files under the allowed roots, in-memory
// URLs, and the CDNs our own templates load from. Kept free of I/O so the rules can be tested without a browser.

export const RENDER_CDN_HOSTS = ["cdn.tailwindcss.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];
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

// The URL parser has already collapsed dot segments (encoded or not), so a containment check on the path is enough.
const isInsideFileRoots = (parsed: URL, allowedFileRoots: readonly string[]): boolean => {
  const filePath = filePathOf(parsed);
  if (filePath === undefined) return false;
  return allowedFileRoots.some((root) => {
    const relative = nodePath.relative(nodePath.resolve(root), filePath);
    return relative === "" || (!relative.startsWith("..") && !nodePath.isAbsolute(relative));
  });
};

export const isAllowedRenderRequest = (url: string, allowedFileRoots: readonly string[] = []): boolean => {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (IN_MEMORY_SCHEMES.includes(parsed.protocol)) return true;
  if (parsed.protocol === "file:") return isInsideFileRoots(parsed, allowedFileRoots);
  return parsed.protocol === "https:" && parsed.port === "" && RENDER_CDN_HOSTS.includes(parsed.hostname);
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
