import type { MulmoImageMedia, MulmoMovieMedia } from "../../types/index.js";
import { imageHtml, mediaSrc, movieHtml } from "../image_plugins/media_html.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * Image and movie beats as markup a host can inject.
 *
 * The src comes straight from the beat's source: a url is used as written, a path is
 * emitted for the host to resolve against its own page, and a base64 source renders
 * nothing because the schema carries no media type to build a `data:` URI from.
 *
 * Neither needs a runtime, so neither sets `requires` — an `<img>` and a `<video>` are
 * markup the browser already knows.
 */
export const imageToHtml = (image: MulmoImageMedia, alt: string): BeatHtmlFragment | undefined => {
  const src = mediaSrc(image.source);
  return src === undefined ? undefined : { html: imageHtml(src, alt) };
};

export const movieToHtml = (image: MulmoMovieMedia): BeatHtmlFragment | undefined => {
  const src = mediaSrc(image.source);
  return src === undefined ? undefined : { html: movieHtml(src) };
};
