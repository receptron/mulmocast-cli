import test from "node:test";
import assert from "node:assert";
import { chartHtml, resolveChartPlugins, stringifyChartData } from "../../src/utils/image_plugins/chart_html.js";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

/**
 * Characterization tests for the chart renderer, which is shared by the Node render path
 * (PNG / PDF / movie) and the `mulmo html` dump.
 *
 * The exact bytes are pinned, not just the elements: the markup is embedded in a document
 * whose Chart.js is loaded elsewhere, so a change here is inert until a chart silently
 * stops drawing.
 */

const CHART_DATA = { type: "bar", data: { labels: ["a", "b"], datasets: [{ data: [1, 2] }] } };

const chartPluginHtml = () => {
  const plugin = findImagePlugin("chart");
  assert.ok(plugin?.html, "the chart plugin must expose an html method");
  return plugin.html;
};

test("chart markup is exact", () => {
  assert.strictEqual(
    chartHtml(stringifyChartData({ type: "bar" }), "Revenue", "c1"),
    [
      "",
      '<div class="chart-container mb-6">',
      '  <h3 class="text-xl font-semibold mb-4">Revenue</h3>',
      '  <div class="w-full" style="position: relative; height: 400px;">',
      '    <canvas id="c1"></canvas>',
      "  </div>",
      "  <script>",
      "    (function() {",
      `      const ctx = document.getElementById('c1').getContext('2d');`,
      '      new Chart(ctx, {\n  "type": "bar"\n});',
      "    })();",
      "  </script>",
      "</div>",
    ].join("\n"),
  );
});

test("an empty title falls back to Chart, a present one is escaped into the heading", () => {
  assert.match(chartHtml("{}", "", "c1"), /<h3 class="text-xl font-semibold mb-4">Chart<\/h3>/);
  assert.match(chartHtml("{}", "  ", "c1"), /<h3 class="text-xl font-semibold mb-4"> {2}<\/h3>/);
  assert.match(chartHtml("{}", "日本語 & <b>", "c1"), /<h3 class="text-xl font-semibold mb-4">日本語 &amp; &lt;b&gt;<\/h3>/);
});

// The title is text, not markup, so an entity reference stops decoding as well: a browser
// showed "Revenue &amp; Profit" rendering as "Revenue & Profit" before and literally after.
// Pinned because it is the second user-visible consequence of the fix, and the easier to miss.
test("entity references in a title become literal text", () => {
  assert.match(chartHtml("{}", "Revenue &amp; Profit", "c1"), /<h3[^>]*>Revenue &amp;amp; Profit<\/h3>/);
  assert.match(chartHtml("{}", "&#x58;", "c1"), /<h3[^>]*>&amp;#x58;<\/h3>/);
});

// Verified in a real browser before and after: with these values main executed the injected
// handler AND lost the chart entirely, because the `</script>` ended the block that draws it.
test("a hostile title and hostile chart data cannot escape their contexts", () => {
  const html = chartHtml(stringifyChartData({ label: "</script><script>pwn()</script>" }), '</h3><img src=x onerror="pwn()">', "c1");
  assert.strictEqual(html.match(/<h3/g)?.length, 1, "the heading must not be closed early");
  assert.strictEqual(html.match(/<script>/g)?.length, 1, "only the chart's own script tag may appear");
  assert.strictEqual(html.match(/<\/script>/g)?.length, 1, "the chart's script must not be terminated early");
  assert.ok(!html.includes("<img"), "no injected element may survive");
  assert.ok(html.includes("&lt;/h3&gt;"), "the title is neutralized, not dropped");
});

test("the caller-supplied id is the only id, and reaches both the canvas and the lookup", () => {
  const html = chartHtml("{}", "t", "beat-3-chart");
  assert.strictEqual(html.match(/beat-3-chart/g)?.length, 2);
  assert.match(html, /<canvas id="beat-3-chart"><\/canvas>/);
  assert.match(html, /getElementById\('beat-3-chart'\)/);
});

test("chart data is embedded 2-space-indented and round-trips", () => {
  const html = chartHtml(stringifyChartData(CHART_DATA), "t", "c1");
  const embedded = html.match(/new Chart\(ctx, ([\s\S]*?)\);\n {4}\}\)\(\);/)?.[1];
  assert.ok(embedded, "the embedded chart data must be locatable");
  assert.deepStrictEqual(JSON.parse(embedded), CHART_DATA);
  assert.ok(embedded.includes('\n  "type": "bar"'), "must stay pretty-printed with 2 spaces");
});

test("plugin CDNs are resolved per chart type, and unknown types get nothing", () => {
  assert.strictEqual(resolveChartPlugins("sankey"), '<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"></script>');
  assert.strictEqual(resolveChartPlugins("treemap"), '<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3"></script>');
  ["bar", "pie", "", "SANKEY", "Sankey", " sankey", "doughnut"].forEach((type) => {
    assert.strictEqual(resolveChartPlugins(type), "", `${JSON.stringify(type)} must resolve to no plugin`);
  });
});

// Pre-existing on main: the lookup is a plain object literal, so a chart type naming an
// Object.prototype member resolves through the prototype chain. Pinned to make a fix visible,
// not because it is wanted.
test("prototype member names leak through the plugin lookup", () => {
  assert.strictEqual(resolveChartPlugins("constructor"), '<script src="function Object() { [native code] }"></script>');
  assert.strictEqual(resolveChartPlugins("__proto__"), '<script src="[object Object]"></script>');
});

test("the plugin passes the beat straight through to the renderer", async () => {
  const html = await chartPluginHtml()({ beat: { image: { type: "chart", title: "Revenue", chartData: CHART_DATA } } });
  assert.ok(html, "a chart beat must produce html");

  const id = html.match(/<canvas id="([^"]*)">/)?.[1];
  assert.ok(id, "the canvas must carry an id");
  assert.match(id, /^(id|chart-[0-9a-f]{8})$/, "the id must come from generateUniqueId with the chart prefix");
  assert.strictEqual(html, chartHtml(stringifyChartData(CHART_DATA), "Revenue", id));
});

// The wrapper stringifies before it reads `title`, matching the order the code had before
// it was split in two. A `title` getter observing a chartData that cannot be serialized is
// the only way to see the difference, and it is what a reordered wrapper would break.
test("chart data is serialized before the title is read", async () => {
  const html = chartPluginHtml();
  const cyclic: Record<string, unknown> = { type: "bar" };
  cyclic.self = cyclic;
  const read: string[] = [];
  const image = {
    type: "chart",
    chartData: cyclic,
    get title(): string {
      read.push("title");
      return "T";
    },
  };

  await assert.rejects(() => Promise.resolve(html({ beat: { image } })), /circular structure/);
  assert.deepStrictEqual(read, [], "the title must not be read once serialization has thrown");
});

test("stringifyChartData pretty-prints with two spaces", () => {
  assert.strictEqual(stringifyChartData({ type: "bar", n: 1 }), '{\n  "type": "bar",\n  "n": 1\n}');
});

test("the plugin declines beats that are not charts", async () => {
  const html = chartPluginHtml();
  assert.strictEqual(await html({ beat: {} }), undefined);
  assert.strictEqual(await html({ beat: { image: undefined } }), undefined);
  assert.strictEqual(await html({ beat: { image: { type: "markdown", markdown: "x" } } }), undefined);
});

// generateUniqueId returns the literal "id" under NODE_ENV=test, which is what CI sets, so
// the id's real shape is only observable with that flag off.
test("each call gets its own chart-prefixed id", async () => {
  const html = chartPluginHtml();
  const saved = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    const beat = { image: { type: "chart", title: "t", chartData: {} } };
    const ids = await Promise.all([0, 1, 2].map(async () => (await html({ beat }))?.match(/<canvas id="([^"]*)">/)?.[1]));
    ids.forEach((id) => assert.match(id ?? "", /^chart-[0-9a-f]{8}$/));
    assert.strictEqual(new Set(ids).size, 3, `ids must be unique, got ${JSON.stringify(ids)}`);
  } finally {
    if (saved === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = saved;
    }
  }
});
