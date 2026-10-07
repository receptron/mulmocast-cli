import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import dgram from "node:dgram";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderHTMLToImage } from "../../src/utils/html_render.js";

// A page that tries every network channel a probe found: request interception alone misses prefetch and
// WebSocket, and WebRTC (UDP) needs the constructors removed before any page script runs.
const hostilePage = (base: string, udpPort: number) => `<!doctype html><html><head>
<style>body{background:url(${base}/css-url)}</style>
<link rel="prefetch" href="${base}/prefetch"><script src="${base}/script.js"></script></head><body>
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
