// Timeout budgets for the different kinds of network waits. Generous safety
// nets against a stalled socket — NOT tight deadlines — so legitimate slow
// responses still succeed while a genuine hang becomes a rejection.
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000; // small assets (reference/background images, JSON)
export const FETCH_DOWNLOAD_TIMEOUT_MS = 60_000; // generated image download
export const FETCH_MEDIA_DOWNLOAD_TIMEOUT_MS = 180_000; // large video/audio download
export const FETCH_API_TIMEOUT_MS = 120_000; // generation API POST (e.g. TTS text -> audio)

/**
 * fetch() with an AbortController timeout.
 *
 * A stalled connection otherwise yields a promise that never resolves or
 * rejects; callers relying on GraphAI `retry` never recover because retry only
 * fires on rejection. This converts a timeout into a thrown error so the caller
 * (and its retry) can react. The success path is unchanged — the returned
 * Response is the raw fetch Response.
 */
export const safeFetch = async (url: string | URL, init: Parameters<typeof fetch>[1] = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
