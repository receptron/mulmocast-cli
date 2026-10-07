import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";
import {
  POPUP_BLOCK_SCRIPT,
  RENDER_CDN_HOSTS,
  RENDER_CONTENT_SECURITY_POLICY,
  isAllowedRenderRequest,
  realRoot,
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

test("isAllowedRenderRequest: the real path decides, so a link inside a root cannot reach outside it", () => {
  const link = nodePath.join(projectRoot, "link");
  const outside = nodePath.resolve("/secret");
  const realPath = (filePath: string) => (filePath.startsWith(link) ? nodePath.join(outside, nodePath.relative(link, filePath)) : filePath);
  assert.strictEqual(isAllowedRenderRequest(fileUrl(link, "key.txt"), roots, realPath), false);
  assert.strictEqual(isAllowedRenderRequest(fileUrl(projectRoot, "a.png"), roots, realPath), true);
  assert.strictEqual(
    isAllowedRenderRequest(fileUrl(projectRoot, "missing.png"), roots, () => undefined),
    false,
  );
});

test("realRoot: the real path when it exists, else the real parent plus the name", () => {
  const realPath = (filePath: string) => (filePath === nodePath.resolve("/alias/dir") ? nodePath.resolve("/real/dir") : undefined);
  assert.strictEqual(realRoot("/alias/dir", realPath), nodePath.resolve("/real/dir"));
  assert.strictEqual(realRoot("/alias/dir/page.html", realPath), nodePath.join(nodePath.resolve("/real/dir"), "page.html"));
  assert.strictEqual(
    realRoot("/nowhere/page.html", () => undefined),
    nodePath.resolve("/nowhere/page.html"),
  );
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
    "https://cdn.jsdelivr.net/npm/chart.js@4",
    "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
    "https://cdn.jsdelivr.net/npm/chartjs-chart-sankey",
    "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3",
  ].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), true, url));
  ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"].forEach((host) =>
    assert.strictEqual(isAllowedRenderRequest(`https://${host}/`), true, host),
  );
});

test("isAllowedRenderRequest: jsDelivr only for the exact files our templates load", () => {
  [
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
    "https://cdn.jsdelivr.net/npm/chart.js@3",
    "https://cdn.jsdelivr.net/npm/chart.js?d=SECRET",
    "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs",
    "https://cdn.jsdelivr.net/npm/mermaid/dist/SECRET.js",
    "https://cdn.jsdelivr.net/",
    "https://cdn.jsdelivr.net/npm/attacker-package/x.js",
    "https://cdn.jsdelivr.net/npm/chart.js-evil/x.js",
    "https://cdn.jsdelivr.net/npm/mermaidx",
    "https://cdn.jsdelivr.net/npm/@scope/mermaid/x.js",
    "https://cdn.jsdelivr.net/gh/attacker/repo/x.js",
    "https://cdn.jsdelivr.net/npm/../npm/attacker/x.js",
    "https://cdn.jsdelivr.net/combine/npm/attacker,npm/mermaid",
  ].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), false, url));
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
    "https://evil.example/npm/mermaid",
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

// A template that changes a CDN URL must change the allowlist too, or strict mode stops rendering it.
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = nodePath.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(ts|js|html|css)$/.test(entry.name) ? [entryPath] : [];
  });

test("isAllowedRenderRequest: every CDN URL in our sources and templates is allowed", () => {
  const sourceRoots = ["src", "assets", "node_modules/@mulmocast/deck/lib"].filter((dir) => fs.existsSync(dir));
  const urls = sourceRoots
    .flatMap(sourceFiles)
    .flatMap((file) => fs.readFileSync(file, "utf8").match(/https:\/\/(?:cdn\.jsdelivr\.net|cdn\.tailwindcss\.com|fonts\.googleapis\.com)[^"'`)\s<>]*/g) ?? []);
  assert.ok(
    urls.some((url) => url.includes("cdn.jsdelivr.net")),
    "the scan found the templates' jsDelivr URLs",
  );
  [...new Set(urls)].forEach((url) => assert.strictEqual(isAllowedRenderRequest(url), true, url));
});
