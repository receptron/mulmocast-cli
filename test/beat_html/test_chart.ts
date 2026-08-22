import test from "node:test";
import assert from "node:assert";
import { chartToHtml } from "../../src/utils/beat_html/chart.js";
import { chartHtml, stringifyChartData } from "../../src/utils/image_plugins/chart_html.js";
import { mulmoChartMediaSchema } from "../../src/types/schema.js";

/**
 * Verified end to end in a browser: two fragments injected through `innerHTML`, a host that
 * loads Chart.js from `requires` and drives every `[data-mulmo-chart]` canvas. Both charts
 * drew, `#app` contained no `<script>` at all, and a hostile title produced no element.
 */

const media = (over: Record<string, unknown> = {}) =>
  mulmoChartMediaSchema.parse({ type: "chart", title: "Sales", chartData: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } }, ...over });

test("the fragment carries no script, because an injected one would not run", () => {
  const { html } = chartToHtml(media(), "beat-0");
  assert.strictEqual(html.toLowerCase().split("<script").length - 1, 0, "a fragment must not carry a script tag");
  assert.match(html, /<canvas id="beat-0-chart" data-chart-ready="false" data-mulmo-chart="/);
});

test("the config rides on the canvas and parses back to the original", () => {
  const chartData = { type: "bar", data: { labels: ["Q&A", "<b>"], datasets: [{ data: [1, 2] }] } };
  const { html } = chartToHtml(media({ chartData }), "beat-1");
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
  assert.deepStrictEqual(chartToHtml(media(), "b").requires, ["chart"]);
  assert.strictEqual(chartToHtml(media(), "b").chartPlugins, undefined, "a plain bar chart needs no plugin");
  assert.deepStrictEqual(chartToHtml(media({ chartData: { type: "sankey" } }), "b").chartPlugins, ["https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"]);
  assert.deepStrictEqual(chartToHtml(media({ chartData: { type: "treemap" } }), "b").chartPlugins, ["https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3"]);
});

test("a chart type that is absent or not a string asks for no plugin", () => {
  [{}, { type: 7 }, { type: null }].forEach((chartData) => {
    assert.strictEqual(chartToHtml(media({ chartData }), "b").chartPlugins, undefined, `${JSON.stringify(chartData)} must ask for nothing`);
  });
});

test("a hostile title and hostile config cannot escape their contexts", () => {
  const { html } = chartToHtml(media({ title: '</h3><img src=x onerror="pwn()">', chartData: { s: '"><img src=x onerror="pwn()">' } }), "b");
  assert.strictEqual(html.toLowerCase().split("<img").length - 1, 0, "no injected element may survive");
  assert.strictEqual(html.toLowerCase().split("<h3").length - 1, 1, "the heading must not be closed early");
  assert.strictEqual(html.toLowerCase().split("<canvas").length - 1, 1, "the attribute must not start a second element");
});

test("the id goes through the element id rule", () => {
  assert.throws(() => chartToHtml(media(), "beat 1"), /element id must match/);
  assert.throws(() => chartToHtml(media(), "0"), /element id must match/);
});

// The point of sharing image_plugins/chart_html.ts: one card, two wrappers. If they drift,
// the browser and the PNG show different charts for the same beat.
test("the fragment and the document path draw the same card", () => {
  const image = media();
  const fragment = chartToHtml(image, "beat-9").html;
  const document = chartHtml(stringifyChartData(image.chartData), image.title, "beat-9-chart");
  const withoutCanvasAndScript = (html: string) => html.replace(/<canvas[^>]*><\/canvas>/, "«canvas»").replace(/\n {2}<script>[\s\S]*<\/script>/, "");
  assert.strictEqual(withoutCanvasAndScript(fragment), withoutCanvasAndScript(document));
});
