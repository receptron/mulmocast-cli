import type { ResolvedBranding, SlideBranding } from "@mulmocast/deck";
import type { BackgroundImage, MulmoMediaSource } from "../../types/index.js";
import { backgroundImageCss, backgroundImageLayout, resolveBackgroundImage } from "../image_plugins/bg_image_css.js";
import { pickBranding } from "../image_plugins/slide_branding.js";
import { mediaSrc } from "../image_plugins/media_html.js";
import { neutralizeStyleTerminator } from "../html_escape.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";

/**
 * The decorations the PNG render adds around a beat's content — a background image, a slide's
 * branding — resolved for the browser. The PNG path turns each image into a `data:` URI on disk;
 * here the host says how its page reaches the file (`resolveMediaUrl`).
 */

// deck writes these urls into `style="…url('…')"` and `src="…"` unescaped, and a url from a script can carry a quote
// (`z.url()` accepts one). Percent-encoding leaves a url that still loads and cannot leave either context.
const UNSAFE_URL_CHARACTERS = /["'()\\<>\s]/g;

export const safeMediaUrl = (url: string): string =>
  url.replace(UNSAFE_URL_CHARACTERS, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

const mediaUrl = (source: MulmoMediaSource, options: BeatHtmlOptions): string | undefined => {
  const url = (options.resolveMediaUrl ?? mediaSrc)(source);
  return url === undefined ? undefined : safeMediaUrl(url);
};

type PaintedBackground = { url: string; size: string; opacity: number };

const paintedBackground = (beatBackgroundImage: BackgroundImage | undefined, options: BeatHtmlOptions): PaintedBackground | undefined => {
  const backgroundImage = resolveBackgroundImage(beatBackgroundImage, options.backgroundImage);
  if (!backgroundImage) return undefined;
  const url = typeof backgroundImage === "string" ? safeMediaUrl(backgroundImage) : mediaUrl(backgroundImage.source, options);
  return url === undefined ? undefined : { url, ...backgroundImageLayout(backgroundImage) };
};

/** A textSlide / markdown fragment with `documentCss` for the background the PNG paints on `body`. */
export const withDocumentBackground = (
  fragment: BeatHtmlFragment | undefined,
  image: { backgroundImage?: BackgroundImage },
  options: BeatHtmlOptions,
): BeatHtmlFragment | undefined => {
  const background = paintedBackground(image.backgroundImage, options);
  if (!fragment || !background) return fragment;
  return { ...fragment, documentCss: neutralizeStyleTerminator(backgroundImageCss(background.url, background.size, background.opacity)) };
};

/** A chart / mermaid beat's background, as the branding layer of the figure slide deck draws it on. */
export const backgroundDecoration = (image: { backgroundImage?: BackgroundImage }, options: BeatHtmlOptions): { branding?: ResolvedBranding } => {
  const background = paintedBackground(image.backgroundImage, options);
  return background ? { branding: { backgroundImage: { dataUrl: background.url, size: background.size, opacity: background.opacity } } } : {};
};

const resolvedLogo = (logo: NonNullable<SlideBranding["logo"]>, options: BeatHtmlOptions): ResolvedBranding["logo"] => {
  const dataUrl = mediaUrl(logo.source, options);
  return dataUrl === undefined ? undefined : { dataUrl, position: logo.position, width: logo.width };
};

const resolvedBrandingBackground = (
  backgroundImage: NonNullable<SlideBranding["backgroundImage"]>,
  options: BeatHtmlOptions,
): ResolvedBranding["backgroundImage"] => {
  const dataUrl = mediaUrl(backgroundImage.source, options);
  if (dataUrl === undefined) return undefined;
  return { dataUrl, size: backgroundImage.size ?? "cover", opacity: backgroundImage.opacity ?? 1, bgOpacity: backgroundImage.bgOpacity };
};

/** A slide beat's branding, resolved as `convertBrandingToResolved` does on the Node side. */
export const slideBranding = (beatBranding: SlideBranding | null | undefined, options: BeatHtmlOptions): ResolvedBranding | undefined => {
  const branding = pickBranding(beatBranding, options.branding);
  if (!branding) return undefined;
  const logo = branding.logo && resolvedLogo(branding.logo, options);
  const backgroundImage = branding.backgroundImage && resolvedBrandingBackground(branding.backgroundImage, options);
  return { ...(logo ? { logo } : {}), ...(backgroundImage ? { backgroundImage } : {}) };
};
