import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import dgram from "node:dgram";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mock } from "node:test";
import puppeteer from "puppeteer";
import { GraphAILogger } from "graphai";
import { renderHTMLToImage } from "../../src/utils/html_render.js";
import { guardRenderPage } from "../../src/utils/render_network_guard.js";
import { strictNetworkLaunchArgs } from "../../src/utils/render_network_policy.js";

// A page that tries every network channel a probe found: request interception alone misses prefetch and
// WebSocket, and WebRTC (UDP) needs the constructors removed before any page script runs.
const hostilePage = (base: string, udpPort: number) => `<!doctype html><html><head>
<style>body{background:url(${base}/css-url)}</style>
<link rel="prefetch" href="${base}/prefetch"><link rel="preconnect" href="${base}"><script src="${base}/script.js"></script></head><body>
<img src="${base}/img"><iframe src="${base}/iframe"></iframe>
<script>
const B = ${JSON.stringify(base)};
try { fetch(B + "/fetch").catch(() => {}); } catch (e) {}
try { const x = new XMLHttpRequest(); x.open("GET", B + "/xhr"); x.send(); } catch (e) {}
try { new WebSocket(B.replace("http", "ws") + "/ws"); } catch (e) {}
try { new EventSource(B + "/sse"); } catch (e) {}
try { navigator.sendBeacon(B + "/beacon", "x"); } catch (e) {}
try { import(B + "/import.js").catch(() => {}); } catch (e) {}
try { new Worker(URL.createObjectURL(new Blob(['fetch("' + B + '/worker-fetch").catch(() => {})'], { type: "text/javascript" }))); } catch (e) {}
try { window.open(B + "/window-open"); } catch (e) {}
const rtc = "const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:127.0.0.1:${udpPort}' }] }); pc.createDataChannel('p'); pc.createOffer().then((offer) => pc.setLocalDescription(offer));";
try {
  const popup = window.open("");
  if (popup) popup.document.write("<script>" + rtc + "</" + "script>");
} catch (e) {}
try {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:127.0.0.1:${udpPort}" }] });
  pc.createDataChannel("x");
  pc.createOffer().then((offer) => pc.setLocalDescription(offer));
} catch (e) {}
</script></body></html>`;

// No external src: without strict mode this page would load through setContent, where a probe found that
// prefetch and WebRTC escape the guard.
const inlineOnlyPage = (base: string, udpPort: number) => `<html><head><link rel="prefetch" href="${base}/prefetch"></head><body><script>
try { fetch(${JSON.stringify(base)} + "/fetch").catch(() => {}); } catch (e) {}
try {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:127.0.0.1:${udpPort}" }] });
  pc.createDataChannel("x");
  pc.createOffer().then((offer) => pc.setLocalDescription(offer));
} catch (e) {}
</script></body></html>`;

const PROBE_SETTLE_MS = 3000;

const startProbeServers = async () => {
  const hits: string[] = [];
  const server = http.createServer((request, response) => {
    hits.push(`http ${request.url}`);
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
  });
  server.on("connection", () => hits.push("tcp"));
  server.on("upgrade", (request, socket) => {
    hits.push(`ws ${request.url}`);
    socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const udp = dgram.createSocket("udp4");
  udp.on("message", () => hits.push("udp"));
  await new Promise<void>((resolve) => udp.bind(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  const close = () => {
    server.close();
    udp.close();
  };
  return { hits, base: `http://127.0.0.1:${port}`, udpPort: udp.address().port, close };
};

const renderProbePage = async (page: typeof hostilePage, strictNetwork: boolean): Promise<string[]> => {
  const probe = await startProbeServers();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-strict-"));
  try {
    await renderHTMLToImage(page(probe.base, probe.udpPort), path.join(outDir, "out.png"), 320, 240, false, false, { strictNetwork });
    await new Promise((resolve) => setTimeout(resolve, PROBE_SETTLE_MS));
    return [...new Set(probe.hits)];
  } finally {
    probe.close();
    fs.rmSync(outDir, { recursive: true, force: true });
  }
};

test("renderHTMLToImage: without strict mode the probe page reaches the network (control)", { timeout: 120_000 }, async () => {
  const hits = await renderProbePage(hostilePage, false);
  ["http /fetch", "http /img", "ws /ws"].forEach((hit) => assert.ok(hits.includes(hit), `${hit} in ${hits.join(", ")}`));
});

test("renderHTMLToImage: strict mode lets nothing reach the network", { timeout: 120_000 }, async () => {
  assert.deepStrictEqual(await renderProbePage(hostilePage, true), []);
});

test("renderHTMLToImage: strict mode also covers a page that would otherwise use setContent", { timeout: 120_000 }, async () => {
  assert.ok((await renderProbePage(inlineOnlyPage, false)).length > 0, "control: the inline page reaches the network without strict mode");
  assert.deepStrictEqual(await renderProbePage(inlineOnlyPage, true), []);
});

const readFileProbe = (okUrl: string, secretUrl: string) => `<!doctype html><html><body><iframe id="f" src="${secretUrl}"></iframe><script>
const results = {};
const read = (name, url) => fetch(url).then((response) => response.text()).then((text) => { results[name] = text; }, () => { results[name] = "blocked"; });
Promise.all([read("ok", ${JSON.stringify(okUrl)}), read("secret", ${JSON.stringify(secretUrl)})]).then(() => {
  try { results.iframe = document.getElementById("f").contentDocument.body.textContent; } catch (e) { results.iframe = "blocked"; }
  document.title = JSON.stringify(results);
});
</script></body></html>`;

test("guardRenderPage: files outside the allowed roots cannot be read; files inside can", { timeout: 120_000 }, async () => {
  const allowedDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-allowed-"));
  const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-secret-"));
  fs.writeFileSync(path.join(allowedDir, "ok.txt"), "OK-CONTENT");
  fs.writeFileSync(path.join(secretDir, "secret.txt"), "TOP-SECRET");
  const pageFile = path.join(allowedDir, "page.html");
  fs.writeFileSync(pageFile, readFileProbe(pathToFileURL(path.join(allowedDir, "ok.txt")).href, pathToFileURL(path.join(secretDir, "secret.txt")).href));
  const isCI = process.env.CI === "true";
  const browser = await puppeteer.launch({ args: [...(isCI ? ["--no-sandbox"] : []), "--allow-file-access-from-files", ...strictNetworkLaunchArgs()] });
  try {
    const page = await browser.newPage();
    await guardRenderPage(page, [allowedDir]);
    await page.goto(pathToFileURL(pageFile).href, { waitUntil: "load" });
    await page.waitForFunction('document.title.startsWith("{")', { timeout: 20_000 });
    const results = JSON.parse(await page.title());
    assert.strictEqual(results.ok, "OK-CONTENT");
    assert.strictEqual(results.secret, "blocked");
    assert.ok(!String(results.iframe).includes("TOP-SECRET"), String(results.iframe));
  } finally {
    await browser.close();
    fs.rmSync(allowedDir, { recursive: true, force: true });
    fs.rmSync(secretDir, { recursive: true, force: true });
  }
});

test("renderHTMLToImage: strict mode passes the allowed roots through; a file outside them is blocked", { timeout: 120_000 }, async () => {
  const allowedDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-allowed-"));
  const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-secret-"));
  const okImage = path.join(allowedDir, "ok.png");
  const secretImage = path.join(secretDir, "secret.png");
  fs.copyFileSync(path.join(process.cwd(), "assets/images/mulmocast_credit.png"), okImage);
  fs.copyFileSync(okImage, secretImage);
  const logged: string[] = [];
  const info = mock.method(GraphAILogger, "info", (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  });
  try {
    const html = `<html><body><img src="${pathToFileURL(okImage).href}"><img src="${pathToFileURL(secretImage).href}"></body></html>`;
    await renderHTMLToImage(html, path.join(allowedDir, "out.png"), 320, 240, false, false, { strictNetwork: true, allowedFileRoots: [allowedDir] });
  } finally {
    info.mock.restore();
    fs.rmSync(allowedDir, { recursive: true, force: true });
    fs.rmSync(secretDir, { recursive: true, force: true });
  }
  const blocked = logged.filter((line) => line.startsWith("strict network: blocked"));
  assert.ok(
    blocked.some((line) => line.includes("secret.png")),
    blocked.join("\n"),
  );
  assert.ok(!blocked.some((line) => line.includes("ok.png")), blocked.join("\n"));
});

test("guardRenderPage: a symlink inside an allowed root does not reach files outside it", { timeout: 120_000 }, async (t) => {
  const allowedDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-allowed-"));
  const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmocast-secret-"));
  fs.writeFileSync(path.join(allowedDir, "ok.txt"), "OK-CONTENT");
  fs.writeFileSync(path.join(secretDir, "secret.txt"), "TOP-SECRET");
  try {
    fs.symlinkSync(secretDir, path.join(allowedDir, "link"), "dir");
  } catch {
    t.skip("symlinks need extra privileges on this platform");
    return;
  }
  const pageFile = path.join(allowedDir, "page.html");
  fs.writeFileSync(
    pageFile,
    readFileProbe(pathToFileURL(path.join(allowedDir, "ok.txt")).href, pathToFileURL(path.join(allowedDir, "link", "secret.txt")).href),
  );
  const isCI = process.env.CI === "true";
  const browser = await puppeteer.launch({ args: [...(isCI ? ["--no-sandbox"] : []), "--allow-file-access-from-files", ...strictNetworkLaunchArgs()] });
  try {
    const page = await browser.newPage();
    await guardRenderPage(page, [allowedDir]);
    await page.goto(pathToFileURL(pageFile).href, { waitUntil: "load" });
    await page.waitForFunction('document.title.startsWith("{")', { timeout: 20_000 });
    const results = JSON.parse(await page.title());
    assert.strictEqual(results.ok, "OK-CONTENT");
    assert.strictEqual(results.secret, "blocked");
    assert.ok(!String(results.iframe).includes("TOP-SECRET"), String(results.iframe));
  } finally {
    await browser.close();
    fs.rmSync(allowedDir, { recursive: true, force: true });
    fs.rmSync(secretDir, { recursive: true, force: true });
  }
});
