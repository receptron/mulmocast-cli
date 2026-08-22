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
 * not a second renderer. Its chart driver script is stripped: see `withoutScripts`.
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
/**
 * deck's chart block emits an inline `<script>` that drives the canvas, because the same
 * markup has to work in the standalone document Puppeteer renders. A fragment injected
 * through `innerHTML` never runs it, and the config is on the canvas as `data-mulmo-chart`
 * for exactly that reason — so it is dropped rather than shipped as dead markup that
 * contradicts what BeatHtmlFragment promises.
 *
 * Written as a scan rather than a regex over `<script[^>]*>`: the config JSON inside the
 * block contains `<` sequences of its own, and a regex that has to be right about which one
 * closes the tag is the kind that is wrong once.
 */
export const withoutScripts = (html: string): string => {
  const parts: string[] = [];
  let rest = html;
  for (let open = rest.toLowerCase().indexOf("<script"); open !== -1; open = rest.toLowerCase().indexOf("<script")) {
    const close = rest.toLowerCase().indexOf("</script>", open);
    if (close === -1) break;
    parts.push(rest.slice(0, open));
    rest = rest.slice(close + "</script>".length);
  }
  parts.push(rest);
  return parts.join("");
};

export const slideToHtml = (image: MulmoSlideMedia, options: BeatHtmlOptions): BeatHtmlFragment => {
  const theme = image.theme ?? options.slideTheme ?? slideThemes.corporate;
  const fragment = generateSlideFragment(theme, image.slide, { scopeClass: `${options.idPrefix}-slide` });
  return {
    html: withoutScripts(fragment.html),
    css: fragment.css,
    ...(fragment.requires.length > 0 ? { requires: fragment.requires } : {}),
    ...(fragment.chartPlugins.length > 0 ? { chartPlugins: fragment.chartPlugins } : {}),
    ...(fragment.mermaidTheme ? { mermaidTheme: fragment.mermaidTheme } : {}),
  };
};
