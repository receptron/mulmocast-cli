import test from "node:test";
import assert from "node:assert";
import { renderSlideContent } from "../../src/slide/layouts/index.js";

// ═══════════════════════════════════════════════════════════
// title layout
// ═══════════════════════════════════════════════════════════

test("title: renders title text in h1", () => {
  const html = renderSlideContent({ layout: "title", title: "Welcome" });
  assert.ok(html.includes("<h1"));
  assert.ok(html.includes("Welcome"));
});

test("title: renders subtitle when provided", () => {
  const html = renderSlideContent({ layout: "title", title: "Hello", subtitle: "World" });
  assert.ok(html.includes("World"));
});

test("title: renders author when provided", () => {
  const html = renderSlideContent({ layout: "title", title: "T", author: "John" });
  assert.ok(html.includes("John"));
});

test("title: renders note in card container", () => {
  const html = renderSlideContent({ layout: "title", title: "T", note: "Draft" });
  assert.ok(html.includes("Draft"));
  assert.ok(html.includes("bg-d-card"));
});

test("title: omits subtitle/author/note when not provided", () => {
  const html = renderSlideContent({ layout: "title", title: "Only Title" });
  const lines = html.split("\n").filter(Boolean);
  assert.ok(lines.length > 0);
  assert.ok(!html.includes("undefined"));
});

test("title: renders decorative circles", () => {
  const html = renderSlideContent({ layout: "title", title: "T" });
  assert.ok(html.includes("rounded-full"));
  assert.ok(html.includes("opacity-10"));
});

// ═══════════════════════════════════════════════════════════
// columns layout
// ═══════════════════════════════════════════════════════════

test("columns: renders 2 columns side by side", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Two Cols",
    columns: [{ title: "Col A" }, { title: "Col B" }],
  });
  assert.ok(html.includes("Col A"));
  assert.ok(html.includes("Col B"));
  assert.ok(html.includes("flex gap-4"));
});

test("columns: renders arrow separators when showArrows is true", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Arrows",
    columns: [{ title: "A" }, { title: "B" }, { title: "C" }],
    showArrows: true,
  });
  assert.ok(html.includes("\u25B6"));
});

test("columns: omits arrows when showArrows is false", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "No Arrows",
    columns: [{ title: "A" }, { title: "B" }],
    showArrows: false,
  });
  assert.ok(!html.includes("\u25B6"));
});

test("columns: renders card with numbered badge", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Numbered",
    columns: [{ title: "Step 1", num: 1 }],
  });
  assert.ok(html.includes("rounded-full"));
  assert.ok(html.includes(">1<"));
});

test("columns: renders card with icon", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Icons",
    columns: [{ title: "API", icon: "⚡" }],
  });
  assert.ok(html.includes("⚡"));
});

test("columns: renders card with content blocks inside", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Content",
    columns: [{ title: "A", content: [{ type: "text", value: "Inner text" }] }],
  });
  assert.ok(html.includes("Inner text"));
});

test("columns: renders callout bar at bottom", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "T",
    columns: [{ title: "A" }],
    callout: { text: "Note here", label: "Info" },
  });
  assert.ok(html.includes("Note here"));
  assert.ok(html.includes("Info:"));
});

test("columns: renders step label above title", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Main Title",
    stepLabel: "Phase 1",
    columns: [{ title: "A" }],
  });
  assert.ok(html.includes("Phase 1"));
});

test("columns: renders empty columns array without error", () => {
  const html = renderSlideContent({
    layout: "columns",
    title: "Empty",
    columns: [],
  });
  assert.ok(html.includes("Empty"));
});

// ═══════════════════════════════════════════════════════════
// comparison layout
// ═══════════════════════════════════════════════════════════

test("comparison: renders left and right panels", () => {
  const html = renderSlideContent({
    layout: "comparison",
    title: "Compare",
    left: { title: "Before", accentColor: "danger" },
    right: { title: "After", accentColor: "success" },
  });
  assert.ok(html.includes("Before"));
  assert.ok(html.includes("After"));
  assert.ok(html.includes("text-d-danger"));
  assert.ok(html.includes("text-d-success"));
});

test("comparison: renders content blocks in panels", () => {
  const html = renderSlideContent({
    layout: "comparison",
    title: "Compare",
    left: { title: "L", content: [{ type: "bullets", items: ["Point A"] }] },
    right: { title: "R", content: [{ type: "bullets", items: ["Point B"] }] },
  });
  assert.ok(html.includes("Point A"));
  assert.ok(html.includes("Point B"));
});

// ═══════════════════════════════════════════════════════════
// grid layout
// ═══════════════════════════════════════════════════════════

test("grid: renders items in grid container", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "Services",
    items: [{ title: "API" }, { title: "DB" }, { title: "Cache" }],
  });
  assert.ok(html.includes("grid grid-cols-3"));
  assert.ok(html.includes("API"));
  assert.ok(html.includes("DB"));
  assert.ok(html.includes("Cache"));
});

test("grid: respects gridColumns setting", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "Two Col Grid",
    gridColumns: 2,
    items: [{ title: "A" }, { title: "B" }],
  });
  assert.ok(html.includes("grid-cols-2"));
});

test("grid: renders item with icon", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "G",
    items: [{ title: "Fast", icon: "⚡" }],
  });
  assert.ok(html.includes("⚡"));
});

test("grid: renders item with description", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "G",
    items: [{ title: "Item", description: "A detailed description" }],
  });
  assert.ok(html.includes("A detailed description"));
});

test("grid: renders item with content blocks", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "G",
    items: [{ title: "Item", content: [{ type: "metric", value: "99%", label: "Score" }] }],
  });
  assert.ok(html.includes("99%"));
  assert.ok(html.includes("Score"));
});

test("grid: renders footer text", () => {
  const html = renderSlideContent({
    layout: "grid",
    title: "G",
    items: [{ title: "A" }],
    footer: "Source: Internal data",
  });
  assert.ok(html.includes("Source: Internal data"));
});

// ═══════════════════════════════════════════════════════════
// bigQuote layout
// ═══════════════════════════════════════════════════════════

test("bigQuote: renders quote in blockquote", () => {
  const html = renderSlideContent({
    layout: "bigQuote",
    quote: "To be or not to be",
  });
  assert.ok(html.includes("<blockquote"));
  assert.ok(html.includes("To be or not to be"));
  assert.ok(html.includes("&ldquo;"));
  assert.ok(html.includes("&rdquo;"));
});

test("bigQuote: renders author and role", () => {
  const html = renderSlideContent({
    layout: "bigQuote",
    quote: "Quote",
    author: "Shakespeare",
    role: "Playwright",
  });
  assert.ok(html.includes("Shakespeare"));
  assert.ok(html.includes("Playwright"));
});

test("bigQuote: renders decorative accent lines", () => {
  const html = renderSlideContent({
    layout: "bigQuote",
    quote: "Test",
    accentColor: "accent",
  });
  assert.ok(html.includes("bg-d-accent"));
  assert.ok(html.includes("w-24"));
});

// ═══════════════════════════════════════════════════════════
// stats layout
// ═══════════════════════════════════════════════════════════

test("stats: renders stat cards with large values", () => {
  const html = renderSlideContent({
    layout: "stats",
    title: "KPIs",
    stats: [
      { value: "10K", label: "Users" },
      { value: "$1M", label: "Revenue" },
    ],
  });
  assert.ok(html.includes("text-[52px]"));
  assert.ok(html.includes("10K"));
  assert.ok(html.includes("$1M"));
});

test("stats: renders change indicators", () => {
  const html = renderSlideContent({
    layout: "stats",
    title: "KPIs",
    stats: [{ value: "42", label: "Score", change: "+5" }],
  });
  assert.ok(html.includes("+5"));
  assert.ok(html.includes("text-d-success"));
});

test("stats: renders negative change in red", () => {
  const html = renderSlideContent({
    layout: "stats",
    title: "KPIs",
    stats: [{ value: "3", label: "Rating", change: "-1" }],
  });
  assert.ok(html.includes("text-d-danger"));
});

// ═══════════════════════════════════════════════════════════
// timeline layout
// ═══════════════════════════════════════════════════════════

test("timeline: renders horizontal timeline with items", () => {
  const html = renderSlideContent({
    layout: "timeline",
    title: "Milestones",
    items: [
      { date: "Q1", title: "Launch" },
      { date: "Q2", title: "Scale" },
    ],
  });
  assert.ok(html.includes("Q1"));
  assert.ok(html.includes("Q2"));
  assert.ok(html.includes("Launch"));
  assert.ok(html.includes("Scale"));
});

test("timeline: renders connecting line", () => {
  const html = renderSlideContent({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "A" }],
  });
  assert.ok(html.includes("h-[2px]"));
  assert.ok(html.includes("bg-d-alt"));
});

test("timeline: renders done items with filled dot", () => {
  const html = renderSlideContent({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "Done", done: true, color: "success" }],
  });
  assert.ok(html.includes("bg-d-success"));
});

test("timeline: renders description with newlines", () => {
  const html = renderSlideContent({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "A", description: "Line1\nLine2" }],
  });
  assert.ok(html.includes("Line1<br>Line2"));
});

// ═══════════════════════════════════════════════════════════
// split layout
// ═══════════════════════════════════════════════════════════

test("split: renders left and right panels with ratio", () => {
  const html = renderSlideContent({
    layout: "split",
    left: { title: "Left Side", ratio: 60 },
    right: { title: "Right Side", ratio: 40 },
  });
  assert.ok(html.includes("Left Side"));
  assert.ok(html.includes("Right Side"));
  assert.ok(html.includes('style="flex: 60"'));
  assert.ok(html.includes('style="flex: 40"'));
});

test("split: renders dark panel with bg-d-card", () => {
  const html = renderSlideContent({
    layout: "split",
    left: { title: "Dark", dark: true },
  });
  assert.ok(html.includes("bg-d-card"));
});

test("split: renders content blocks in panels", () => {
  const html = renderSlideContent({
    layout: "split",
    left: { title: "L", content: [{ type: "bullets", items: ["Item A"] }] },
    right: { title: "R", content: [{ type: "text", value: "Text B" }] },
  });
  assert.ok(html.includes("Item A"));
  assert.ok(html.includes("Text B"));
});

test("split: renders label above title", () => {
  const html = renderSlideContent({
    layout: "split",
    left: { title: "Main", label: "Section A" },
  });
  assert.ok(html.includes("Section A"));
});

// ═══════════════════════════════════════════════════════════
// matrix layout
// ═══════════════════════════════════════════════════════════

test("matrix: renders 2x2 grid of cells", () => {
  const html = renderSlideContent({
    layout: "matrix",
    title: "SWOT",
    cells: [{ label: "Strengths" }, { label: "Weaknesses" }, { label: "Opportunities" }, { label: "Threats" }],
  });
  assert.ok(html.includes("Strengths"));
  assert.ok(html.includes("Weaknesses"));
  assert.ok(html.includes("Opportunities"));
  assert.ok(html.includes("Threats"));
});

test("matrix: renders cell items as bullet list", () => {
  const html = renderSlideContent({
    layout: "matrix",
    title: "M",
    cells: [{ label: "S", items: ["Good team", "Strong brand"] }],
  });
  assert.ok(html.includes("Good team"));
  assert.ok(html.includes("Strong brand"));
  assert.ok(html.includes("&bull;"));
});

test("matrix: renders axis labels when provided", () => {
  const html = renderSlideContent({
    layout: "matrix",
    title: "M",
    xAxis: { low: "Low", high: "High", label: "Impact" },
    yAxis: { low: "Low", high: "High", label: "Effort" },
    cells: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
  });
  assert.ok(html.includes("Impact"));
  assert.ok(html.includes("Effort"));
});

test("matrix: omits axis labels when not provided", () => {
  const html = renderSlideContent({
    layout: "matrix",
    title: "M",
    cells: [{ label: "A" }],
  });
  assert.ok(!html.includes("writing-mode"));
});

test("matrix: renders cell with accent color", () => {
  const html = renderSlideContent({
    layout: "matrix",
    title: "M",
    cells: [{ label: "Green", accentColor: "success" }],
  });
  assert.ok(html.includes("text-d-success"));
  assert.ok(html.includes("bg-d-success"));
});

// ═══════════════════════════════════════════════════════════
// table layout
// ═══════════════════════════════════════════════════════════

test("table: renders headers and rows", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "Data",
    headers: ["Name", "Score"],
    rows: [
      ["Alice", "95"],
      ["Bob", "87"],
    ],
  });
  assert.ok(html.includes("<table"));
  assert.ok(html.includes("<th"));
  assert.ok(html.includes("Name"));
  assert.ok(html.includes("Score"));
  assert.ok(html.includes("Alice"));
  assert.ok(html.includes("87"));
});

test("table: renders striped rows by default", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["A"],
    rows: [["1"], ["2"]],
  });
  assert.ok(html.includes("bg-d-alt/30"));
});

test("table: does not stripe when striped is false", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["A"],
    rows: [["1"], ["2"]],
    striped: false,
  });
  assert.ok(!html.includes("bg-d-alt/30"));
});

test("table: renders styled cells with color and bold", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["Feature", "Status"],
    rows: [[{ text: "Ready", color: "success", bold: true }, "Done"]],
  });
  assert.ok(html.includes("text-d-success"));
  assert.ok(html.includes("font-bold"));
});

test("table: renders row headers in bold", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["Feature", "Value"],
    rows: [["Storage", "100GB"]],
    rowHeaders: true,
  });
  // First cell should have font-bold (row header)
  const cells = html.match(/<td[^>]*>[^<]*/g) || [];
  assert.ok(cells.length >= 1);
  assert.ok(cells[0].includes("font-bold"));
});

test("table: renders badge-styled cell with rounded-full pill", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["Name", "Status"],
    rows: [["Item", { text: "+0.69%", color: "success", badge: true }]],
  });
  assert.ok(html.includes("rounded-full"));
  assert.ok(html.includes("bg-d-success"));
  assert.ok(html.includes("text-white"));
  assert.ok(html.includes("+0.69%"));
});

test("table: badge without color falls back to normal rendering", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["Name", "Value"],
    rows: [["Item", { text: "Normal", badge: true }]],
  });
  assert.ok(!html.includes("rounded-full"));
  assert.ok(html.includes("Normal"));
});

test("table: badge cell applies inline markup", () => {
  const html = renderSlideContent({
    layout: "table",
    title: "T",
    headers: ["Metric"],
    rows: [[{ text: "**+5%**", color: "success", badge: true }]],
  });
  assert.ok(html.includes("<strong>+5%</strong>"));
  assert.ok(html.includes("rounded-full"));
});

// ═══════════════════════════════════════════════════════════
// funnel layout
// ═══════════════════════════════════════════════════════════

test("funnel: renders stages with decreasing width", () => {
  const html = renderSlideContent({
    layout: "funnel",
    title: "Pipeline",
    stages: [
      { label: "Leads", value: "1000" },
      { label: "Qualified", value: "300" },
      { label: "Closed", value: "50" },
    ],
  });
  assert.ok(html.includes("Leads"));
  assert.ok(html.includes("1000"));
  assert.ok(html.includes("Closed"));
  // First stage should be 100% width, last should be narrower
  assert.ok(html.includes('width: 100%"'));
  assert.ok(html.includes('width: 45%"'));
});

test("funnel: renders stage description", () => {
  const html = renderSlideContent({
    layout: "funnel",
    title: "F",
    stages: [{ label: "Stage", description: "Details here" }],
  });
  assert.ok(html.includes("Details here"));
});

test("funnel: renders stages with accent colors", () => {
  const html = renderSlideContent({
    layout: "funnel",
    title: "F",
    stages: [
      { label: "A", color: "info" },
      { label: "B", color: "success" },
    ],
  });
  assert.ok(html.includes("bg-d-info"));
  assert.ok(html.includes("bg-d-success"));
});

test("funnel: single stage renders at 100% width", () => {
  const html = renderSlideContent({
    layout: "funnel",
    title: "F",
    stages: [{ label: "Only" }],
  });
  assert.ok(html.includes('width: 100%"'));
});

// ═══════════════════════════════════════════════════════════
// unknown layout
// ═══════════════════════════════════════════════════════════

test("unknown layout: renders error message", () => {
  // Force an unknown layout via type assertion
  const html = renderSlideContent({ layout: "unknown" as "title", title: "T" });
  assert.ok(html.includes("Unknown layout"));
});
