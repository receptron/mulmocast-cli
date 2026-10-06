// What a remotion scene's browser may reach: only the bundle server started for that render, and
// in-memory URLs. Kept free of I/O so the rules can be tested without a browser.

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const IN_MEMORY_SCHEMES = ["data:", "blob:"];

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

// Remotion's /proxy makes the bundle server download its `src` from Node, on the scene's behalf.
const REMOTION_PROXY_PATH = "/proxy";
// The only page that carries the CSP; any other HTML the server returns (a directory listing, a 404)
// would run without it, so no other path may be loaded as a document.
const SCENE_DOCUMENT_PATHS = ["/", "/index.html"];

export type SceneRequest = { url: string; isDocument: boolean };

// Another port on localhost is another service, so only the render's own port counts as local.
const isBundleServer = (parsed: URL, serverPort: number) =>
  parsed.protocol === "http:" && LOOPBACK_HOSTS.includes(parsed.hostname) && parsed.port === String(serverPort);

export const isAllowedSceneRequest = ({ url, isDocument }: SceneRequest, serverPort: number): boolean => {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (IN_MEMORY_SCHEMES.includes(parsed.protocol)) return true;
  if (!isBundleServer(parsed, serverPort) || parsed.pathname.startsWith(REMOTION_PROXY_PATH)) return false;
  return !isDocument || SCENE_DOCUMENT_PATHS.includes(parsed.pathname);
};

// Remotion downloads <Audio> / <Video> sources from Node while rendering, outside the browser;
// a scene uses no media files, so only inline data survives.
export const isAllowedMediaDownload = (src: string): boolean => parseUrl(src)?.protocol === "data:";

// The browser-level request block does not see WebSocket or EventSource connections; this does.
export const REMOTION_CONTENT_SECURITY_POLICY = "connect-src 'self' data: blob:";

const HEAD_TAG = /<head(\s[^>]*)?>/i;

export const withContentSecurityPolicy = (html: string): string => {
  const match = HEAD_TAG.exec(html);
  if (!match) throw new Error("remotion: the bundle's index.html has no <head>, so the network policy cannot be applied");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${REMOTION_CONTENT_SECURITY_POLICY}">`;
  const insertAt = match.index + match[0].length;
  return [html.slice(0, insertAt), meta, html.slice(insertAt)].join("");
};

export const WEBRTC_GLOBALS = ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel", "RTCIceCandidate", "RTCSessionDescription"] as const;

// Run before any page script in every frame: WebRTC opens UDP connections that neither the request
// block nor CSP covers. Non-configurable, so scene code cannot put the constructors back.
export const WEBRTC_REMOVAL_SCRIPT = [
  `for (const name of ${JSON.stringify(WEBRTC_GLOBALS)}) {`,
  "  try { Object.defineProperty(globalThis, name, { value: undefined, writable: false, configurable: false }); } catch (_) {}",
  "}",
].join("\n");
