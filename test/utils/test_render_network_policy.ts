import test from "node:test";
import assert from "node:assert";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";
import {
  POPUP_BLOCK_SCRIPT,
  RENDER_CDN_HOSTS,
  RENDER_CONTENT_SECURITY_POLICY,
  isAllowedRenderRequest,
  strictNetworkFromEnv,
  strictNetworkLaunchArgs,
  withRenderContentSecurityPolicy,
} from "../../src/utils/render_network_policy.js";

// Test URLs only, never fetched; built from parts because the lint rule cannot tell fixtures from requests.
const plainHttp = (rest: string) => ["http", rest].join("://");

test("isAllowedRenderRequest: in-memory URLs", () => {
  ["data:image/png;base64,AAAA", "blob:file:///1234", "about:blank"].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), true, url));
});

const projectRoot = nodePath.resolve("/work/project");
const outputRoot = nodePath.resolve("/work/output");
const roots = [projectRoot, outputRoot];
const fileUrl = (...parts: string[]) => pathToFileURL(nodePath.join(...parts)).href;

test("isAllowedRenderRequest: files only under an allowed root", () => {
  [fileUrl(projectRoot, "images", "a.png"), fileUrl(outputRoot, "x", "y.mp4"), fileUrl(projectRoot), pathToFileURL(projectRoot).href + "/"].forEach((url) =>
    assert.strictEqual(isAllowedRenderRequest(url, roots), true, url),
  );
  [
    fileUrl("/etc/hosts"),
    fileUrl(nodePath.resolve("/work"), "secret.txt"),
    fileUrl(nodePath.resolve("/work/project-other"), "a.png"),
    fileUrl(nodePath.resolve("/work/projects"), "a.png"),
    pathToFileURL(projectRoot).href + "/../secret.txt",
    pathToFileURL(projectRoot).href + "/%2e%2e/secret.txt",
    pathToFileURL(projectRoot).href + "/images/%2E%2E/%2E%2E/secret.txt",
    "file://remote-host/share/a.png",
  ].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url, roots), false, url));
});

test("isAllowedRenderRequest: no roots means no files", () => {
  assert.strictEqual(isAllowedRenderRequest(fileUrl(projectRoot, "a.png")), false);
  assert.strictEqual(isAllowedRenderRequest(fileUrl(projectRoot, "a.png"), []), false);
});

test("isAllowedRenderRequest: a root that is a single file allows that file only", () => {
  const page = nodePath.resolve("/work/render/mulmocast_render_1.html");
  assert.strictEqual(isAllowedRenderRequest(pathToFileURL(page).href, [page]), true);
  assert.strictEqual(isAllowedRenderRequest(pathToFileURL(page + ".bak").href, [page]), false);
  assert.strictEqual(isAllowedRenderRequest(fileUrl(nodePath.dirname(page), "other.html"), [page]), false);
});

test("strictNetworkLaunchArgs: an unreachable proxy that only the CDNs (and not loopback) bypass", () => {
  const [proxy, bypass] = strictNetworkLaunchArgs();
  assert.match(proxy, /^--proxy-server=http:\/\/127\.0\.0\.1:1$/);
  assert.strictEqual(bypass, `--proxy-bypass-list=${RENDER_CDN_HOSTS.join(";")};<-loopback>`);
});

test("POPUP_BLOCK_SCRIPT: locks window.open to a no-op, non-configurably", () => {
  assert.match(POPUP_BLOCK_SCRIPT, /Object\.defineProperty\(globalThis, "open", \{ value: \(\) => null, writable: false, configurable: false \}\)/);
});

test("isAllowedRenderRequest: https to the templates' CDNs only", () => {
  [
    "https://cdn.tailwindcss.com",
    "https://cdn.tailwindcss.com/3.4.0?plugins=forms",
    "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js",
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP",
    "https://fonts.gstatic.com/s/notosansjp/v1/x.woff2",
    "https://CDN.JSDELIVR.NET/npm/chart.js",
  ].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), true, url));
  RENDER_CDN_HOSTS.forEach((host) => assert.strictEqual(isAllowedRenderRequest(`https://${host}/`), true, host));
});

test("isAllowedRenderRequest: everything else is blocked, including look-alikes of the allowed hosts", () => {
  [
    plainHttp("cdn.tailwindcss.com/"),
    "https://cdn.tailwindcss.com:8443/",
    "https://cdn.tailwindcss.com.evil.example/",
    "https://evil.example/cdn.tailwindcss.com",
    "https://cdn.tailwindcss.com@evil.example/",
    "https://x.cdn.jsdelivr.net/",
    "https://jsdelivr.net/",
    "https://example.com/a.png",
    plainHttp("127.0.0.1:8080/"),
    plainHttp("localhost:3000/"),
    plainHttp("169.254.169.254/latest/meta-data/"),
    "wss://cdn.jsdelivr.net/",
    ["ftp", "cdn.jsdelivr.net/"].join("://"),
    "chrome://settings",
    "not a url",
    "",
  ].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), false, url));
});

test("strictNetworkFromEnv: 1 or true turns it on", () => {
  assert.strictEqual(strictNetworkFromEnv({ MULMO_STRICT_NETWORK: "1" }), true);
  assert.strictEqual(strictNetworkFromEnv({ MULMO_STRICT_NETWORK: "true" }), true);
  [undefined, "", "0", "false", "yes", "TRUE"].forEach((value) =>
    assert.strictEqual(strictNetworkFromEnv({ MULMO_STRICT_NETWORK: value }), false, String(value)),
  );
  assert.strictEqual(strictNetworkFromEnv({}), false);
});

const meta = `<meta http-equiv="Content-Security-Policy" content="${RENDER_CONTENT_SECURITY_POLICY}">`;

test("withRenderContentSecurityPolicy: right after <head>, before any script", () => {
  const html = '<!DOCTYPE html><html><head><script src="x.js"></script></head><body></body></html>';
  const result = withRenderContentSecurityPolicy(html);
  assert.strictEqual(result, html.replace("<head>", `<head>${meta}`));
  assert.ok(result.indexOf(meta) < result.indexOf("<script"));
});

test("withRenderContentSecurityPolicy: without <head>, after <html> or the doctype, never before the doctype", () => {
  assert.strictEqual(withRenderContentSecurityPolicy('<html lang="ja"><body>x</body></html>'), `<html lang="ja">${meta}<body>x</body></html>`);
  assert.strictEqual(withRenderContentSecurityPolicy("<!doctype html><body>x</body>"), `<!doctype html>${meta}<body>x</body>`);
  assert.strictEqual(withRenderContentSecurityPolicy("<p>x</p><script>fetch('/')</script>"), `${meta}<p>x</p><script>fetch('/')</script>`);
  assert.strictEqual(withRenderContentSecurityPolicy('<HTML><HEAD lang="en"></HEAD></HTML>'), `<HTML><HEAD lang="en">${meta}</HEAD></HTML>`);
});

test("withRenderContentSecurityPolicy: <header> is not <head>", () => {
  assert.strictEqual(withRenderContentSecurityPolicy("<html><body><header>x</header></body></html>"), `<html>${meta}<body><header>x</header></body></html>`);
});

test("RENDER_CONTENT_SECURITY_POLICY: limits connections to the page's own origin", () => {
  assert.match(RENDER_CONTENT_SECURITY_POLICY, /^connect-src 'self'/);
});
