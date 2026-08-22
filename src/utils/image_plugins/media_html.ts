import type { MulmoMediaSource } from "../../types/index.js";
import { escapeHtml } from "@mulmocast/deck/lib/utils.js";

/**
 * Markup for image and movie media. Pure — no Node, no filesystem — because the Node dump
 * path and the browser fragment path show the same media and must show it the same way.
 *
 * `src` is escaped: `z.url()` accepts a quote, so a url from a script can otherwise close
 * the attribute. Measured — `https://e.com/a.mp4" onerror="pwn()` parses clean.
 */

/**
 * The src a browser can load from a media source. A `base64` source has no media type in
 * the schema, so there is nothing to build a `data:` URI from; a `path` is emitted as
 * written and left for the host to resolve against its own page.
 */
export const mediaSrc = (source: MulmoMediaSource): string | undefined => {
  if (source.kind === "url") return source.url;
  if (source.kind === "path") return source.path;
  return undefined;
};

export const imageHtml = (src: string, alt: string): string =>
  `\n<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="w-full rounded-lg shadow-lg" />`;

export const movieHtml = (src: string): string => {
  const url = escapeHtml(src);
  return `
<div class="movie-container mb-6">
  <div class="relative w-full" style="padding-bottom: 56.25%; /* 16:9 aspect ratio */">
    <video
      class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
      controls
      preload="metadata"
    >
      <source src="${url}" type="video/mp4">
      <source src="${url}" type="video/webm">
      <source src="${url}" type="video/ogg">
      Your browser does not support the video tag.
    </video>
  </div>
</div>`;
};
