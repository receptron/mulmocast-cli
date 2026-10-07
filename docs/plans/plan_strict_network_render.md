# Strict network mode for the HTML renderers (#1594 part 2)

## Why

The Puppeteer renderers (`src/utils/html_render.ts`, `src/actions/pdf.ts`) render content a MulmoScript controls with full network access. Part 1 (#1609) guarded the remotion renderer always; for these renderers the decision (2026-10-07) is an **opt-in strict mode**, default unchanged.

## Decisions

- Opt in with `--strict-network` (any command) or `MULMO_STRICT_NETWORK=1`; library callers set `context.strictNetwork`.
- Allowed: `file:` under the script's folder and mulmocast's output folders (and the renderer's own temp page) — decided after review, since any `file:` let a script render `/etc/hosts` into its output — `data:` / `blob:` / `about:`, and `https:` to the CDN hosts our own templates use: `cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`. Everything else is blocked and logged.
- URLs in the script's own content (markdown images, html_tailwind `src`, `fetch`) are not loaded in strict mode.
- `mulmocast-vision` launches its own browser inside the library: an upstream issue, not a fix here.

## What a probe established (Puppeteer 25.12, a hostile page against a local server)

| guard                                      | `setContent`                                                                                     | page loaded from a temp `file://`            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `page.setRequestInterception`              | fetch / XHR / img / CSS / worker / beacon / import blocked; **prefetch, WebSocket, WebRTC leak** | prefetch blocked too; WebSocket, WebRTC leak |
| + CSP `connect-src 'self' data: blob:`     | WebSocket blocked                                                                                | same                                         |
| + WebRTC removal (`evaluateOnNewDocument`) | **does not run** (setContent reuses the existing document)                                       | **nothing reaches the network**              |

A second probe found that popups (`window.open`, `a[target=_blank]`) and `<link rel=preconnect>` still reached the network (a popup is a new target outside the page's interception), and that a scripted popup still had WebRTC. So strict browsers also start with an unreachable proxy that only the CDN hosts bypass (0 requests, 0 TCP connections; `--block-new-web-contents` had no effect headless), and `window.open` is locked. So strict mode always loads through a temp file and applies all of these. The allowlisted CDNs still work under the guard (Tailwind styles, mermaid renders from jsdelivr).

## Changes

- `src/utils/render_network_policy.ts` (pure): the allowlist, `isAllowedRenderRequest`, CSP injection that works with or without `<head>`.
- `src/utils/render_network_guard.ts`: request interception + WebRTC removal on a Puppeteer page.
- `html_render.ts`: each renderer takes `{ strictNetwork }`; strict mode forces the temp-file path.
- `pdf.ts`: the same for the PDF page.
- CLI flag + env → `context.strictNetwork` → every caller.
