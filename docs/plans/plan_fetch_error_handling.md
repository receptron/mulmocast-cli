# Fetch Error Handling Improvement Plan

## Overview

Improve error handling for all `fetch` calls in the codebase by adding:
1. try-catch for network errors
2. AbortController for timeout

## Current State

Existing fetch calls use only `assert(response.ok, ...)` without:
- try-catch for network errors (fetch throws before response.ok check)
- Timeout handling (can wait indefinitely)

## Files to Update

### src/methods/mulmo_media_source.ts
- `downLoadReferenceImage`
- `MulmoMediaSourceMethods.getText`
- `MulmoMediaSourceMethods.imagePluginSource`

### src/actions/pdf.ts
- `loadImage` (already has try-catch but no timeout)

### src/agents/*.ts
- Various agents that make fetch calls

## Proposed Pattern

```typescript
const DEFAULT_FETCH_TIMEOUT_MS = 30000;

const safeFetch = async (url: string, options?: RequestInit, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timeout: ${url}`);
    }
    throw new Error(`Fetch failed: ${url}: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    clearTimeout(timeoutId);
  }
};
```

## Implementation Steps

1. Create `src/utils/fetch.ts` with `safeFetch` utility
2. Update each file to use `safeFetch` instead of raw `fetch`
3. Add appropriate error causes for each context
4. Add tests for timeout and network error scenarios

## Priority

Medium - Current implementation works but is not robust against network issues.
