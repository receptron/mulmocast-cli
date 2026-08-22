import test from "node:test";
import assert from "node:assert";
import { slideToHtml } from "../../src/utils/beat_html/slide.js";
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
