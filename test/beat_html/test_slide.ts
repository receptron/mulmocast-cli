import test from "node:test";
import assert from "node:assert";
import { slideToHtml, withoutScripts } from "../../src/utils/beat_html/slide.js";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { generateSlideFragment } from "@mulmocast/deck/lib/fragment.js";

import { slideThemes } from "../../src/data/slideThemes.js";
import { mulmoBeatSchema, mulmoSlideMediaSchema } from "../../src/types/schema.js";

/**
 * The fragment is `@mulmocast/deck`'s body-only renderer, the counterpart of the
 * `generateSlideHTML` the Node path uses. It is not a second implementation, so what these
 * pin is the mapping onto BeatHtmlFragment and the theme order — not the slide markup,
 * which is deck's to test.
 */

const media = (over: Record<string, unknown> = {}) => mulmoSlideMediaSchema.parse({ type: "slide", slide: { layout: "title", title: "T" }, ...over });
const options = (over: Record<string, unknown> = {}) => ({ idPrefix: "beat-3", ...over });

test("the fragment is deck's, mapped onto BeatHtmlFragment", () => {
  const image = media();
  const mine = slideToHtml(image, options());
  const theirs = generateSlideFragment(slideThemes.corporate, image.slide, { scopeClass: "beat-3-slide" });
  assert.strictEqual(mine.html, theirs.html);
  assert.strictEqual(mine.css, theirs.css);
});

// Not returned as a field: deck already puts it on the root of `html`, and a host that only
// injects `html` and attaches `css` gets the themed result. Verified in a browser.
test("the scope class rides on the markup, not on a separate field", () => {
  const fragment = slideToHtml(media(), options());
  assert.strictEqual("scopeClass" in fragment, false, "no redundant field");
  assert.match(fragment.html, /^<div class="beat-3-slide /, "the class is on the root of the markup");
  assert.match(fragment.css ?? "", /\.beat-3-slide\{/, "and the css is written against it");
});

// The css is written against the scope class, so a class that changed on every render would
// leave the rules matching nothing after a re-render.
test("the scope class is derived from the idPrefix, so a re-render keeps it", () => {
  assert.strictEqual(slideToHtml(media(), options()).html, slideToHtml(media(), options()).html, "same beat, same class");
  assert.match(slideToHtml(media(), options({ idPrefix: "beat-4" })).html, /^<div class="beat-4-slide /, "a different beat gets a different one");
});

// Same order as MulmoPresentationStyleMethods.getResolvedSlideTheme on the Node side.
test("the beat's theme wins over the deck's, which wins over the built-in", () => {
  // Theme colours are six hex digits with no leading #.
  const beatTheme = { ...slideThemes.corporate, colors: { ...slideThemes.corporate.colors, bg: "111111" } };
  const deckTheme = { ...slideThemes.corporate, colors: { ...slideThemes.corporate.colors, bg: "222222" } };
  assert.match(slideToHtml(media({ theme: beatTheme }), options({ slideTheme: deckTheme })).css ?? "", /111111/);
  assert.match(slideToHtml(media(), options({ slideTheme: deckTheme })).css ?? "", /222222/);
  const fallback = slideToHtml(media(), options()).css ?? "";
  assert.ok(!fallback.includes("111111") && !fallback.includes("222222"), "with neither, the built-in theme is used");
});

// deck's chart block ships an inline driver script, because the same markup has to work in
// the standalone document Puppeteer renders. A fragment injected through innerHTML never
// runs it, and the config is on the canvas as data-mulmo-chart for exactly that reason.
// Verified in a browser: with the script gone, a host driving [data-mulmo-chart] still draws.
test("deck's chart driver script is stripped, and only the script", () => {
  const withChart = media({
    slide: { layout: "split", title: "T", left: { content: [{ type: "chart", chartData: { type: "bar" } }] }, right: { content: [] } },
  });
  const mine = slideToHtml(withChart, options()).html;
  const theirs = generateSlideFragment(slideThemes.corporate, withChart.slide, { scopeClass: "beat-3-slide" }).html;

  assert.strictEqual(mine.toLowerCase().split("<script").length - 1, 0, "no script may survive");
  assert.ok(theirs.toLowerCase().includes("<script"), "deck's own fragment does carry one, or this test proves nothing");
  assert.ok(mine.includes("data-mulmo-chart"), "the config the host drives from must remain");

  // Only the script: every other element is still there, in the same number.
  const count = (html: string, tag: string) => html.toLowerCase().split(`<${tag}`).length - 1;
  ["div", "canvas", "p", "h2", "span"].forEach((tag) => {
    assert.strictEqual(count(mine, tag), count(theirs, tag), `<${tag}> count must be unchanged`);
  });
});

// Both halves case-insensitively. deck writes lower case today, but a guard that only
// recognises the spelling it happens to see is weaker than the thing it guards — the same
// point CodeQL made about an assertion earlier in this series.
test("the strip is case-insensitive at both ends", () => {
  const markup = "a<SCRIPT>x</SCRIPT>b<script>y</SCRIPT>c<SCRIPT>z</script>d";
  assert.strictEqual(withoutScripts(markup), "abcd");
});

test("a slide with no script is passed through untouched", () => {
  const plain = media();
  assert.strictEqual(slideToHtml(plain, options()).html, generateSlideFragment(slideThemes.corporate, plain.slide, { scopeClass: "beat-3-slide" }).html);
});

test("runtimes and plugins are passed through, and absent when the slide needs none", () => {
  const plain = slideToHtml(media(), options());
  assert.strictEqual(plain.requires, undefined, "a title slide needs no runtime");
  assert.strictEqual(plain.chartPlugins, undefined);
  // The blocks live under `content`, which is what deck's detectBlockTypes walks.
  const withChart = slideToHtml(
    media({ slide: { layout: "split", title: "T", left: { content: [{ type: "chart", chartData: { type: "sankey" } }] }, right: { content: [] } } }),
    options(),
  );
  assert.deepStrictEqual(withChart.requires, ["chart"]);
  assert.deepStrictEqual(withChart.chartPlugins, ["https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"]);
});

test("the dispatcher hands the options through, theme included", () => {
  const deckTheme = { ...slideThemes.corporate, colors: { ...slideThemes.corporate.colors, bg: "333333" } };
  const beat = mulmoBeatSchema.parse({ image: media() });
  assert.match(beatToHtml(beat, { idPrefix: "b", slideTheme: deckTheme })!.css ?? "", /333333/);
});

test("the id rule reaches the scope class too", () => {
  assert.throws(() => beatToHtml(mulmoBeatSchema.parse({ image: media() }), { idPrefix: "beat 1" }), /element id must match/);
});
