import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";

import { safeFetch } from "../../src/utils/fetch.js";

const SLOW_RESPONSE_MS = 250;

let server: http.Server;
let baseUrl: string;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/fast") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    } else if (req.url === "/slow") {
      // Responds after a delay — used to prove one call's timeout abort does
      // not cancel another concurrent, still-in-budget request.
      setTimeout(() => {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("slow-ok");
      }, SLOW_RESPONSE_MS);
    } else if (req.url === "/headers-then-hang") {
      // Send headers (promising a body via content-length) and a partial chunk,
      // then never finish — exercises a mid-body stall.
      res.writeHead(200, { "content-type": "application/octet-stream", "content-length": "1000" });
      res.write("partial");
    }
    // Any other path (e.g. "/hang"): intentionally never respond, to exercise the timeout path.
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("safeFetch resolves on a normal response", async () => {
  const res = await safeFetch(`${baseUrl}/fast`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "ok");
});

test("safeFetch rejects with a timeout error when the server never responds", async () => {
  await assert.rejects(
    () => safeFetch(`${baseUrl}/hang`, {}, 100),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Fetch timeout after 100ms/);
      return true;
    },
  );
});

test("safeFetch times out when the body stalls after headers are sent", async () => {
  await assert.rejects(
    () => safeFetch(`${baseUrl}/headers-then-hang`, {}, 120),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Fetch timeout after 120ms/);
      return true;
    },
  );
});

test("safeFetch propagates non-timeout network errors (not as a timeout)", async () => {
  // Nothing listening on port 1 -> connection refused, well before the timeout.
  await assert.rejects(
    () => safeFetch("http://127.0.0.1:1/nope", {}, 5000),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /Fetch timeout/);
      return true;
    },
  );
});

test("safeFetch honors a caller-provided abort signal (composition)", async () => {
  const controller = new AbortController();
  const pending = safeFetch(`${baseUrl}/hang`, { signal: controller.signal }, 5000);
  controller.abort();
  await assert.rejects(pending, (error: unknown) => error instanceof Error);
});

// --- Concurrency safety: each call owns its AbortController + timer, so calls
// running in parallel (the image pipeline uses concurrency: 4) must not
// interfere with one another. ---

test("concurrent safeFetch timeouts each fire at their own budget (no cross-talk)", async () => {
  const budgets = [60, 90, 120, 150, 180, 210];
  const results = await Promise.allSettled(budgets.map((ms) => safeFetch(`${baseUrl}/hang`, {}, ms)));

  results.forEach((result, index) => {
    assert.equal(result.status, "rejected", `call ${index} should have timed out`);
    const reason = (result as PromiseRejectedResult).reason;
    assert.ok(reason instanceof Error);
    // Each rejection must carry its OWN budget — proof the timers/controllers are independent.
    assert.match(reason.message, new RegExp(`Fetch timeout after ${budgets[index]}ms`));
  });
});

test("a concurrent timeout does not abort another in-flight request", async () => {
  // The slow request (2s budget, responds at 250ms) runs alongside several
  // short-budget hangs that abort at ~80ms. If aborts leaked across calls, the
  // slow request would be cancelled too.
  const slow = safeFetch(`${baseUrl}/slow`, {}, 2000);
  const hangs = Array.from({ length: 4 }, () => safeFetch(`${baseUrl}/hang`, {}, 80));

  const hangResults = await Promise.allSettled(hangs);
  hangResults.forEach((result) => assert.equal(result.status, "rejected"));

  const res = await slow;
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "slow-ok");
});

test("many concurrent successful fetches all resolve independently", async () => {
  const responses = await Promise.all(Array.from({ length: 20 }, () => safeFetch(`${baseUrl}/fast`)));
  const texts = await Promise.all(responses.map((r) => r.text()));
  assert.ok(texts.every((t) => t === "ok"));
});
