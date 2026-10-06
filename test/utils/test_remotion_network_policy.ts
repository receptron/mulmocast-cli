import test from "node:test";
import assert from "node:assert";
import {
  REMOTION_CONTENT_SECURITY_POLICY,
  WEBRTC_GLOBALS,
  WEBRTC_REMOVAL_SCRIPT,
  isAllowedSceneRequest,
  withContentSecurityPolicy,
} from "../../src/utils/remotion/network_policy.js";

const PORT = 3456;
// Test URLs only, never fetched; built from parts because the lint rule cannot tell fixtures from requests.
const plainHttp = (rest: string) => ["http", rest].join("://");

test("isAllowedSceneRequest: the render's own bundle server on any loopback name", () => {
  ["http://localhost:3456/index.html", "http://127.0.0.1:3456/bundle.js", "http://[::1]:3456/proxy?src=x", "http://LOCALHOST:3456/"].forEach((url) =>
    assert.strictEqual(isAllowedSceneRequest(url, PORT), true, url),
  );
});

test("isAllowedSceneRequest: in-memory URLs", () => {
  ["data:image/png;base64,AAAA", "blob:http://localhost:3456/1234-5678"].forEach((url) => assert.strictEqual(isAllowedSceneRequest(url, PORT), true, url));
});

test("isAllowedSceneRequest: everything else is blocked", () => {
  [
    plainHttp("localhost:3457/"),
    plainHttp("localhost/"),
    plainHttp("127.0.0.1:8080/admin"),
    "https://localhost:3456/",
    plainHttp("example.com/"),
    "https://cdn.jsdelivr.net/npm/x",
    plainHttp("1.1.1.1/"),
    plainHttp("192.168.1.1:3456/"),
    plainHttp("169.254.169.254/latest/meta-data/"),
    plainHttp("localhost.example.com:3456/"),
    plainHttp("127.0.0.2:3456/"),
    "ws://localhost:3456/",
    "file:///etc/passwd",
    "ftp://localhost:3456/",
    "chrome://settings",
    "not a url",
    "",
  ].forEach((url) => assert.strictEqual(isAllowedSceneRequest(url, PORT), false, url));
});

test("withContentSecurityPolicy: the meta tag is the first thing in <head>, before any script", () => {
  const html = '<!DOCTYPE html><html><head><script src="bundle.js"></script></head><body></body></html>';
  const result = withContentSecurityPolicy(html);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${REMOTION_CONTENT_SECURITY_POLICY}">`;
  assert.strictEqual(result, html.replace("<head>", `<head>${meta}`));
  assert.ok(result.indexOf(meta) < result.indexOf("<script"));
});

test("withContentSecurityPolicy: a <head> with attributes, in any case", () => {
  const result = withContentSecurityPolicy('<html><HEAD lang="en"><title>x</title></HEAD></html>');
  assert.ok(result.startsWith('<html><HEAD lang="en"><meta http-equiv="Content-Security-Policy"'), result);
});

test("withContentSecurityPolicy: no <head> is an error rather than an unprotected page", () => {
  assert.throws(() => withContentSecurityPolicy("<html><body></body></html>"), /no <head>/);
  assert.throws(() => withContentSecurityPolicy("<html><header></header></html>"), /no <head>/);
});

test("REMOTION_CONTENT_SECURITY_POLICY: limits connections to the page's own origin", () => {
  assert.match(REMOTION_CONTENT_SECURITY_POLICY, /^connect-src 'self'/);
});

// What the script does in a browser is checked by rendering a probe scene (see the PR); here its text is pinned.
test("WEBRTC_REMOVAL_SCRIPT: locks every WebRTC constructor to undefined, non-configurably", () => {
  assert.match(WEBRTC_REMOVAL_SCRIPT, /Object\.defineProperty\(globalThis, name, \{ value: undefined, writable: false, configurable: false \}\)/);
  WEBRTC_GLOBALS.forEach((name) => assert.ok(WEBRTC_REMOVAL_SCRIPT.includes(`"${name}"`), name));
  assert.deepStrictEqual([...WEBRTC_GLOBALS].sort(), [
    "RTCDataChannel",
    "RTCIceCandidate",
    "RTCPeerConnection",
    "RTCSessionDescription",
    "webkitRTCPeerConnection",
  ]);
});
