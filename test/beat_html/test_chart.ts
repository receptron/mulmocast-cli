import test from "node:test";
import assert from "node:assert";
import { chartToHtml } from "../../src/utils/beat_html/chart.js";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { generateSlideFragment } from "@mulmocast/deck/lib/fragment.js";
import { slideThemes } from "../../src/data/slideThemes.js";
import { mulmoChartMediaSchema } from "../../src/types/schema.js";

/**
 * A chart beat is drawn by `@mulmocast/deck` as a one-block `figure` slide. What these pin is
 * the mapping onto that slide and onto BeatHtmlFragment — the slide markup is deck's to test.
 */

const media = (over: Record<string, unknown> = {}) =>
  mulmoChartMediaSchema.parse({ type: "chart", title: "Sales", chartData: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } }, ...over });
const options = (over: Record<string, unknown> = {}) => ({ idPrefix: "beat-0", ...over });

test("the fragment is deck's figure slide holding the chart", () => {
  const image = media();
  const mine = chartToHtml(image, options());
  const theirs = generateSlideFragment(
    slideThemes.corporate,
    { layout: "figure", title: "Sales", figure: { type: "chart", chartData: image.chartData } },
    { scopeClass: "beat-0-slide" },
  );
  assert.strictEqual(mine.html, theirs.html);
  assert.strictEqual(mine.css, theirs.css);
});

test("the fragment carries no script, because an injected one would not run", () => {
  const { html } = chartToHtml(media(), options());
  assert.strictEqual(html.toLowerCase().split("<script").length - 1, 0, "a fragment must not carry a script tag");
  assert.match(html, /<canvas id="beat-0-slide-chart-0" data-chart-ready="false" data-mulmo-chart="/);
});

test("the config rides on the canvas and parses back to the original", () => {
  const chartData = { type: "bar", data: { labels: ["Q&A", "<b>"], datasets: [{ data: [1, 2] }] } };
  const { html } = chartToHtml(media({ chartData }), options());
  const attr = html.match(/data-mulmo-chart="([^"]*)"/)?.[1];
  assert.ok(attr, "the attribute must be present");
  const decoded = attr
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  assert.deepStrictEqual(JSON.parse(decoded), chartData, "the host must read back exactly what the beat said");
});

test("the host is told which runtime and which plugins to load", () => {
  assert.deepStrictEqual(chartToHtml(media(), options()).requires, ["chart"]);
  assert.strictEqual(chartToHtml(media(), options()).chartPlugins, undefined, "a plain bar chart needs no plugin");
  assert.deepStrictEqual(chartToHtml(media({ chartData: { type: "sankey" } }), options()).chartPlugins, ["https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"]);
  assert.deepStrictEqual(chartToHtml(media({ chartData: { type: "treemap" } }), options()).chartPlugins, [
    "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3",
  ]);
});

test("a chart type that is absent, not a string, or an Object.prototype member asks for no plugin", () => {
  [{}, { type: 7 }, { type: null }, { type: "constructor" }, { type: "__proto__" }, { type: "toString" }].forEach((chartData) => {
    assert.strictEqual(chartToHtml(media({ chartData }), options()).chartPlugins, undefined, `${JSON.stringify(chartData)} must ask for nothing`);
  });
});

test("the theme is the host's slide theme, falling back to corporate", () => {
  const corporate = chartToHtml(media(), options()).css ?? "";
  const dark = chartToHtml(media(), options({ slideTheme: slideThemes.dark })).css ?? "";
  assert.ok(corporate.includes(`--d-bg:#${slideThemes.corporate.colors.bg}`), corporate);
  assert.ok(dark.includes(`--d-bg:#${slideThemes.dark.colors.bg}`), dark);
});

test("the same beat renders the same markup every time", () => {
  assert.strictEqual(chartToHtml(media(), options()).html, chartToHtml(media(), options()).html);
});

test("two beats on one page do not share an id", () => {
  const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const first = ids(chartToHtml(media(), options({ idPrefix: "beat-1" })).html);
  const second = ids(chartToHtml(media(), options({ idPrefix: "beat-2" })).html);
  assert.ok(first.length > 0);
  assert.deepStrictEqual(
    first.filter((id) => second.includes(id)),
    [],
  );
});

test("a hostile title and hostile config cannot escape their contexts", () => {
  const { html } = chartToHtml(media({ title: '</h2><img src=x onerror="pwn()">', chartData: { s: '"><img src=x onerror="pwn()">' } }), options());
  assert.strictEqual(html.toLowerCase().split("<img").length - 1, 0, "no injected element may survive");
  assert.strictEqual(html.toLowerCase().split("<h2").length - 1, 1, "the heading must not be closed early");
  assert.strictEqual(html.toLowerCase().split("<canvas").length - 1, 1, "the attribute must not start a second element");
});

test("the id prefix goes through the element id rule", () => {
  assert.throws(() => beatToHtml({ text: "", image: media() }, options({ idPrefix: "beat 1" })), /element id must match/);
});
