import type { MulmoSlideMedia } from "@mulmocast/deck";
// Deep import: the package barrel bundles every layout plus all of zod — measured 101 inputs
// and 602kb against 20 and 54kb for this module — and this file is bundled for the browser.
import { generateSlideFragment } from "@mulmocast/deck/lib/fragment.js";
import { slideThemes } from "../../data/slideThemes.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";

/**
 * A slide beat as markup a host can inject.
 *
 * `generateSlideFragment` is the body-only counterpart of the `generateSlideHTML` the Node
 * render path uses, so the two draw the same slide from the same layouts — the fragment is
 * not a second renderer.
 *
 * The theme order matches `MulmoPresentationStyleMethods.getResolvedSlideTheme` on the Node
 * side: the beat's own theme, then the deck's, then the built-in corporate one. Repeating
 * the order here rather than calling that method keeps this file off `MulmoPresentationStyle`,
 * which the browser bundle does not need.
 *
 * The scope class is derived from `idPrefix` so a re-render of the same beat keeps it: the
 * css is written against that class and a generated one would change every render, leaving
 * the rules matching nothing. It is not returned separately — deck already puts it on the
 * root of `html`, verified in a browser: injecting `html` and attaching `css`, with no
 * wrapper class of the host's own, resolves `--d-bg` to the beat's theme.
 */
export const slideToHtml = (image: MulmoSlideMedia, options: BeatHtmlOptions): BeatHtmlFragment => {
  const theme = image.theme ?? options.slideTheme ?? slideThemes.corporate;
  const fragment = generateSlideFragment(theme, image.slide, { scopeClass: `${options.idPrefix}-slide` });
  return {
    html: fragment.html,
    css: fragment.css,
    ...(fragment.requires.length > 0 ? { requires: fragment.requires } : {}),
    ...(fragment.chartPlugins.length > 0 ? { chartPlugins: fragment.chartPlugins } : {}),
    ...(fragment.mermaidTheme ? { mermaidTheme: fragment.mermaidTheme } : {}),
  };
};
