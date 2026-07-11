// Timeout budgets for the different kinds of network waits. Generous safety
// nets against a stalled socket — NOT tight deadlines — so legitimate slow
// responses still succeed while a genuine hang becomes a rejection.
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000; // small assets (reference/background images, JSON)
export const FETCH_DOWNLOAD_TIMEOUT_MS = 60_000; // generated image download
export const FETCH_MEDIA_DOWNLOAD_TIMEOUT_MS = 180_000; // large video/audio download
export const FETCH_API_TIMEOUT_MS = 120_000; // generation API POST (e.g. TTS text -> audio)

// The subset of the fetch Response that callers use. The body is read once, up
// front, so these accessors never touch the network again (no second download
// or extra copy) — unlike reconstructing a `new Response(buffer)`, which would
// buffer the payload a second time.
export type SafeFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
};

/**
 * fetch() with an AbortController timeout that covers the whole exchange —
 * headers AND body.
 *
 * A stalled connection otherwise yields a promise that never resolves or
 * rejects; callers relying on GraphAI `retry` never recover because retry only
 * fires on rejection. The body is read once under the same deadline (a server
 * that sends headers and then stalls mid-body would otherwise hang the caller's
 * body read), and the bytes are handed back through a lightweight result so the
 * caller does not buffer them a second time. An optional caller `signal` is
 * composed with the timeout so upstream cancellation still works.
 */
export const safeFetch = async (
  url: string | URL,
  init: Parameters<typeof fetch>[1] = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<SafeFetchResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init?.signal ?? undefined;
  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.arrayBuffer();
    const decode = () => new TextDecoder().decode(body);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      arrayBuffer: async () => body,
      text: async () => decode(),
      json: async <T = unknown>(): Promise<T> => JSON.parse(decode()),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
};
