// What an HTML renderer's page may reach in strict network mode: local and in-memory URLs, and the CDNs
// our own templates load from. Kept free of I/O so the rules can be tested without a browser.

export const RENDER_CDN_HOSTS = ["cdn.tailwindcss.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];
const LOCAL_SCHEMES = ["file:", "data:", "blob:", "about:"];

export const STRICT_NETWORK_ENV = "MULMO_STRICT_NETWORK";

export const strictNetworkFromEnv = (env: Record<string, string | undefined>): boolean => ["1", "true"].includes(env[STRICT_NETWORK_ENV] ?? "");

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

export const isAllowedRenderRequest = (url: string): boolean => {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (LOCAL_SCHEMES.includes(parsed.protocol)) return true;
  return parsed.protocol === "https:" && parsed.port === "" && RENDER_CDN_HOSTS.includes(parsed.hostname);
};

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
