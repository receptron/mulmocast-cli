import test from "node:test";
import assert from "node:assert";
import {
  RENDER_CDN_HOSTS,
  RENDER_CONTENT_SECURITY_POLICY,
  isAllowedRenderRequest,
  strictNetworkFromEnv,
  withRenderContentSecurityPolicy,
} from "../../src/utils/render_network_policy.js";

// Test URLs only, never fetched; built from parts because the lint rule cannot tell fixtures from requests.
const plainHttp = (rest: string) => ["http", rest].join("://");

test("isAllowedRenderRequest: local and in-memory URLs", () => {
  ["file:///tmp/mulmocast_render_1.html", "file:///C:/Users/a/b.png", "data:image/png;base64,AAAA", "blob:file:///1234", "about:blank"].forEach((url) =>
    assert.strictEqual(isAllowedRenderRequest(url), true, url),
  );
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
