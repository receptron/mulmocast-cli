import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";

import { safeFetch } from "../../src/utils/fetch.js";

let server: http.Server;
let baseUrl: string;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/fast") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
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
