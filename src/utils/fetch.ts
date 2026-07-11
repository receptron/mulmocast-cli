// Timeout budgets for the different kinds of network waits. Generous safety
// nets against a stalled socket — NOT tight deadlines — so legitimate slow
// responses still succeed while a genuine hang becomes a rejection.
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000; // small assets (reference/background images, JSON)
export const FETCH_DOWNLOAD_TIMEOUT_MS = 60_000; // generated image download
export const FETCH_MEDIA_DOWNLOAD_TIMEOUT_MS = 180_000; // large video/audio download
export const FETCH_API_TIMEOUT_MS = 120_000; // generation API POST (e.g. TTS text -> audio)

// Statuses that fetch can surface whose Response must not carry a body
// (constructing `new Response(body, { status })` with a body throws). 1xx
// statuses are excluded: fetch never surfaces them as a final response, and
// `new Response(null, { status: 101 })` itself throws (valid range is 200-599).
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/**
 * fetch() with an AbortController timeout that covers the whole exchange —
 * headers AND body.
 *
 * A stalled connection otherwise yields a promise that never resolves or
 * rejects; callers relying on GraphAI `retry` never recover because retry only
 * fires on rejection. The body is buffered under the same deadline (callers
 * already read it eagerly via arrayBuffer()/json()/text(), so memory behavior
 * is unchanged) — otherwise a server that sends headers and then stalls
 * mid-body would hang the caller's body read instead. Returns a Response backed
 * by the buffered bytes so callers keep using .ok/.status/.headers/.arrayBuffer().
 */
export const safeFetch = async (url: string | URL, init: Parameters<typeof fetch>[1] = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.arrayBuffer();
    return new Response(NULL_BODY_STATUSES.has(response.status) ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
