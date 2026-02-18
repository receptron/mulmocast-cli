import test from "node:test";
import assert from "node:assert";
import { renderContentBlock, renderContentBlocks } from "../../src/slide/blocks.js";
import { resetSlideIdCounter } from "../../src/slide/utils.js";

// ═══════════════════════════════════════════════════════════
// text block
// ═══════════════════════════════════════════════════════════

test("text: renders plain text in paragraph", () => {
  const html = renderContentBlock({ type: "text", value: "Hello world" });
  assert.ok(html.includes("<p"));
  assert.ok(html.includes("Hello world"));
});

test("text: renders bold text with font-bold class", () => {
  const html = renderContentBlock({ type: "text", value: "Bold", bold: true });
  assert.ok(html.includes("font-bold"));
});

test("text: renders dim text with muted color", () => {
  const html = renderContentBlock({ type: "text", value: "Dim", dim: true });
  assert.ok(html.includes("text-d-dim"));
});

test("text: renders text with accent color", () => {
  const html = renderContentBlock({ type: "text", value: "Colored", color: "success" });
  assert.ok(html.includes("text-d-success"));
  assert.ok(!html.includes("text-d-muted"));
});

test("text: renders centered text with text-center", () => {
  const html = renderContentBlock({ type: "text", value: "Center", align: "center" });
  assert.ok(html.includes("text-center"));
});

test("text: renders right-aligned text", () => {
  const html = renderContentBlock({ type: "text", value: "Right", align: "right" });
  assert.ok(html.includes("text-right"));
});

test("text: preserves newlines as <br>", () => {
  const html = renderContentBlock({ type: "text", value: "Line1\nLine2" });
  assert.ok(html.includes("Line1<br>Line2"));
});

test("text: renders large font size with text-xl", () => {
  const html = renderContentBlock({ type: "text", value: "Big", fontSize: 24 });
  assert.ok(html.includes("text-xl"));
});

test("text: renders normal font size with text-[15px]", () => {
  const html = renderContentBlock({ type: "text", value: "Normal", fontSize: 14 });
  assert.ok(html.includes("text-[15px]"));
});

test("text: escapes HTML entities", () => {
  const html = renderContentBlock({ type: "text", value: "<script>alert('xss')</script>" });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
});

// ═══════════════════════════════════════════════════════════
// bullets block
// ═══════════════════════════════════════════════════════════

test("bullets: renders unordered list with bullet markers", () => {
  const html = renderContentBlock({ type: "bullets", items: ["A", "B"] });
  assert.ok(html.includes("<ul"));
  assert.ok(html.includes("</ul>"));
  assert.ok(html.includes("\u2022"));
  assert.ok(html.includes("A"));
  assert.ok(html.includes("B"));
});

test("bullets: renders ordered list with numbers", () => {
  const html = renderContentBlock({ type: "bullets", items: ["First", "Second"], ordered: true });
  assert.ok(html.includes("<ol"));
  assert.ok(html.includes("1."));
  assert.ok(html.includes("2."));
});

test("bullets: renders custom icon bullets", () => {
  const html = renderContentBlock({ type: "bullets", items: ["Item"], icon: "→" });
  assert.ok(html.includes("→"));
  assert.ok(!html.includes("\u2022"));
});

test("bullets: renders empty items array as empty list", () => {
  const html = renderContentBlock({ type: "bullets", items: [] });
  assert.ok(html.includes("<ul"));
  assert.ok(!html.includes("<li"));
});

test("bullets: escapes HTML in items", () => {
  const html = renderContentBlock({ type: "bullets", items: ["<b>bold</b>"] });
  assert.ok(html.includes("&lt;b&gt;"));
});

// ═══════════════════════════════════════════════════════════
// code block
// ═══════════════════════════════════════════════════════════

test("code: renders code in monospace pre block", () => {
  const html = renderContentBlock({ type: "code", code: "const x = 1;" });
  assert.ok(html.includes("<pre"));
  assert.ok(html.includes("font-mono"));
  assert.ok(html.includes("const x = 1;"));
});

test("code: escapes HTML entities in code", () => {
  const html = renderContentBlock({ type: "code", code: "<div>test</div>" });
  assert.ok(html.includes("&lt;div&gt;"));
});

test("code: preserves whitespace with whitespace-pre-wrap", () => {
  const html = renderContentBlock({ type: "code", code: "  indented" });
  assert.ok(html.includes("whitespace-pre-wrap"));
});

// ═══════════════════════════════════════════════════════════
// callout block
// ═══════════════════════════════════════════════════════════

test("callout: renders default callout with background", () => {
  const html = renderContentBlock({ type: "callout", text: "Note here" });
  assert.ok(html.includes("Note here"));
  assert.ok(html.includes("bg-d-card"));
});

test("callout: renders quote style with italic", () => {
  const html = renderContentBlock({ type: "callout", text: "A wise quote", style: "quote" });
  assert.ok(html.includes("italic"));
  assert.ok(html.includes("bg-d-alt"));
});

test("callout: renders info style with blue border", () => {
  const html = renderContentBlock({ type: "callout", text: "Info", style: "info" });
  assert.ok(html.includes("border-l-2"));
  assert.ok(html.includes("border-d-info"));
});

test("callout: renders warning style with border", () => {
  const html = renderContentBlock({ type: "callout", text: "Warn", style: "warning" });
  assert.ok(html.includes("border-l-2"));
  assert.ok(html.includes("border-d-warning"));
});

test("callout: renders callout with label", () => {
  const html = renderContentBlock({ type: "callout", text: "Details", label: "Tip", color: "info" });
  assert.ok(html.includes("Tip:"));
  assert.ok(html.includes("font-bold"));
  assert.ok(html.includes("text-d-info"));
});

// ═══════════════════════════════════════════════════════════
// metric block
// ═══════════════════════════════════════════════════════════

test("metric: renders large value and small label", () => {
  const html = renderContentBlock({ type: "metric", value: "42%", label: "Conversion" });
  assert.ok(html.includes("text-4xl"));
  assert.ok(html.includes("42%"));
  assert.ok(html.includes("text-sm"));
  assert.ok(html.includes("Conversion"));
});

test("metric: renders colored value", () => {
  const html = renderContentBlock({ type: "metric", value: "99%", label: "Score", color: "success" });
  assert.ok(html.includes("text-d-success"));
});

test("metric: renders positive change with green", () => {
  const html = renderContentBlock({ type: "metric", value: "50", label: "Users", change: "+12%" });
  assert.ok(html.includes("text-d-success"));
  assert.ok(html.includes("+12%"));
});

test("metric: renders negative change with red", () => {
  const html = renderContentBlock({ type: "metric", value: "3.2", label: "Rating", change: "-0.5" });
  assert.ok(html.includes("text-d-danger"));
  assert.ok(html.includes("-0.5"));
});

test("metric: omits change element when not provided", () => {
  const html = renderContentBlock({ type: "metric", value: "100", label: "Count" });
  assert.ok(!html.includes("text-d-success"));
  assert.ok(!html.includes("text-d-danger"));
});

// ═══════════════════════════════════════════════════════════
// divider block
// ═══════════════════════════════════════════════════════════

test("divider: renders horizontal line", () => {
  const html = renderContentBlock({ type: "divider" });
  assert.ok(html.includes("h-[2px]"));
  assert.ok(html.includes("bg-d-alt"));
});

test("divider: renders colored divider", () => {
  const html = renderContentBlock({ type: "divider", color: "primary" });
  assert.ok(html.includes("bg-d-primary"));
  assert.ok(!html.includes("bg-d-alt"));
});

// ═══════════════════════════════════════════════════════════
// image block
// ═══════════════════════════════════════════════════════════

test("image: renders img tag with src and alt", () => {
  const html = renderContentBlock({ type: "image", src: "photo.jpg", alt: "A photo" });
  assert.ok(html.includes('<img src="photo.jpg"'));
  assert.ok(html.includes('alt="A photo"'));
});

test("image: defaults to object-contain fit", () => {
  const html = renderContentBlock({ type: "image", src: "img.png" });
  assert.ok(html.includes("object-contain"));
});

test("image: renders cover fit", () => {
  const html = renderContentBlock({ type: "image", src: "img.png", fit: "cover" });
  assert.ok(html.includes("object-cover"));
  assert.ok(!html.includes("object-contain"));
});

test("image: escapes src to prevent XSS", () => {
  const html = renderContentBlock({ type: "image", src: '" onload="alert(1)' });
  assert.ok(html.includes("&quot;"));
});

// ═══════════════════════════════════════════════════════════
// renderContentBlocks (multiple)
// ═══════════════════════════════════════════════════════════

test("renderContentBlocks: renders multiple blocks concatenated", () => {
  const html = renderContentBlocks([{ type: "text", value: "Hello" }, { type: "divider" }, { type: "text", value: "World" }]);
  assert.ok(html.includes("Hello"));
  assert.ok(html.includes("h-[2px]"));
  assert.ok(html.includes("World"));
});

test("renderContentBlocks: returns empty string for empty array", () => {
  const html = renderContentBlocks([]);
  assert.strictEqual(html, "");
});

// ═══════════════════════════════════════════════════════════
// chart block
// ═══════════════════════════════════════════════════════════

test("chart: renders canvas element with unique ID", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({
    type: "chart",
    chartData: { type: "bar", data: { labels: ["A"], datasets: [{ data: [1] }] } },
  });
  assert.ok(html.includes('<canvas id="chart-0"'));
  assert.ok(html.includes("data-chart-ready"));
});

test("chart: embeds chart data as JSON in script", () => {
  resetSlideIdCounter();
  const chartData = { type: "pie", data: { labels: ["X", "Y"], datasets: [{ data: [10, 20] }] } };
  const html = renderContentBlock({ type: "chart", chartData });
  assert.ok(html.includes('"type":"pie"'));
  assert.ok(html.includes("new Chart"));
});

test("chart: renders optional title", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({
    type: "chart",
    chartData: { type: "bar", data: {} },
    title: "Sales Report",
  });
  assert.ok(html.includes("Sales Report"));
  assert.ok(html.includes("font-bold"));
});

test("chart: omits title element when not provided", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "chart", chartData: { type: "bar", data: {} } });
  assert.ok(!html.includes("font-bold text-d-text"));
});

test("chart: disables animation for Puppeteer rendering", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "chart", chartData: { type: "bar", data: {} } });
  assert.ok(html.includes("d.options.animation=false"));
});

// ═══════════════════════════════════════════════════════════
// mermaid block
// ═══════════════════════════════════════════════════════════

test("mermaid: renders div with mermaid class", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "mermaid", code: "graph TD\n  A-->B" });
  assert.ok(html.includes('class="mermaid"'));
  assert.ok(html.includes('id="mermaid-0"'));
});

test("mermaid: escapes HTML in code", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "mermaid", code: '<script>alert("xss")</script>' });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert"));
});

test("mermaid: renders optional title", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "mermaid", code: "graph LR\n  A-->B", title: "Flow Diagram" });
  assert.ok(html.includes("Flow Diagram"));
  assert.ok(html.includes("font-bold"));
});

test("mermaid: omits title element when not provided", () => {
  resetSlideIdCounter();
  const html = renderContentBlock({ type: "mermaid", code: "graph LR\n  A-->B" });
  assert.ok(!html.includes("font-bold text-d-text"));
});
