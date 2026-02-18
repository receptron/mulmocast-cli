import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slideLayoutSchema, mulmoSlideMediaSchema, slideThemeSchema, contentBlockSchema } from "../../src/slide/schema.js";
import { mulmoSlideParamsSchema } from "../../src/types/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// Theme Validation
// ═══════════════════════════════════════════════════════════

const validTheme = {
  colors: {
    bg: "0F172A",
    bgCard: "1E293B",
    bgCardAlt: "334155",
    text: "FFFFFF",
    textMuted: "CBD5E1",
    textDim: "64748B",
    primary: "3B82F6",
    accent: "8B5CF6",
    success: "22C55E",
    warning: "F97316",
    danger: "EF4444",
    info: "14B8A6",
    highlight: "EC4899",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
};

test("slideThemeSchema accepts valid theme with 13 colors and 3 fonts", () => {
  const result = slideThemeSchema.safeParse(validTheme);
  assert.strictEqual(result.success, true);
});

test("slideThemeSchema rejects invalid hex color ZZZZZZ", () => {
  const theme = { ...validTheme, colors: { ...validTheme.colors, primary: "ZZZZZZ" } };
  const result = slideThemeSchema.safeParse(theme);
  assert.strictEqual(result.success, false);
});

test("slideThemeSchema rejects missing font field", () => {
  const theme = { colors: validTheme.colors, fonts: { title: "Georgia", body: "Calibri" } };
  const result = slideThemeSchema.safeParse(theme);
  assert.strictEqual(result.success, false);
});

test("slideThemeSchema rejects 3-digit hex color", () => {
  const theme = { ...validTheme, colors: { ...validTheme.colors, bg: "FFF" } };
  const result = slideThemeSchema.safeParse(theme);
  assert.strictEqual(result.success, false);
});

// ═══════════════════════════════════════════════════════════
// Content Block Validation
// ═══════════════════════════════════════════════════════════

test("contentBlockSchema accepts text block with all options", () => {
  const result = contentBlockSchema.safeParse({
    type: "text",
    value: "Hello",
    align: "center",
    bold: true,
    dim: false,
    fontSize: 24,
    color: "primary",
  });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts minimal text block", () => {
  const result = contentBlockSchema.safeParse({ type: "text", value: "Hello" });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts bullets with ordered and icon", () => {
  const result = contentBlockSchema.safeParse({
    type: "bullets",
    items: ["A", "B", "C"],
    ordered: true,
    icon: "→",
  });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts code block with language", () => {
  const result = contentBlockSchema.safeParse({
    type: "code",
    code: "const x = 1;",
    language: "typescript",
  });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts callout with all styles", () => {
  for (const style of ["quote", "info", "warning"]) {
    const result = contentBlockSchema.safeParse({
      type: "callout",
      text: "Important note",
      label: "Note",
      color: "warning",
      style,
    });
    assert.strictEqual(result.success, true, `style "${style}" should be valid`);
  }
});

test("contentBlockSchema accepts metric with change", () => {
  const result = contentBlockSchema.safeParse({
    type: "metric",
    value: "99.9%",
    label: "Uptime",
    color: "success",
    change: "+0.5%",
  });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts divider", () => {
  const result = contentBlockSchema.safeParse({ type: "divider" });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema accepts image block", () => {
  const result = contentBlockSchema.safeParse({
    type: "image",
    src: "photo.png",
    alt: "A photo",
    fit: "cover",
  });
  assert.strictEqual(result.success, true);
});

test("contentBlockSchema rejects unknown type", () => {
  const result = contentBlockSchema.safeParse({ type: "video", url: "test.mp4" });
  assert.strictEqual(result.success, false);
});

test("contentBlockSchema rejects invalid accent color", () => {
  const result = contentBlockSchema.safeParse({
    type: "metric",
    value: "42",
    label: "Score",
    color: "purple",
  });
  assert.strictEqual(result.success, false);
});

// ═══════════════════════════════════════════════════════════
// Slide Layout Validation
// ═══════════════════════════════════════════════════════════

test("slideLayoutSchema accepts minimal title slide", () => {
  const result = slideLayoutSchema.safeParse({ layout: "title", title: "Hello" });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts title slide with all optional fields", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "title",
    title: "Welcome",
    subtitle: "A great journey",
    author: "John Doe",
    note: "Draft v2",
    accentColor: "accent",
    style: { bgColor: "FF0000", footer: "Page 1" },
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts columns slide with cards", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "columns",
    title: "Three Pillars",
    columns: [
      { title: "A", content: [{ type: "text", value: "First" }] },
      { title: "B", num: 2, accentColor: "accent" },
      { title: "C", icon: "★" },
    ],
    showArrows: true,
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts comparison slide", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "comparison",
    title: "Before vs After",
    left: { title: "Before", accentColor: "danger", content: [{ type: "bullets", items: ["Old way"] }] },
    right: { title: "After", accentColor: "success", content: [{ type: "bullets", items: ["New way"] }] },
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts grid slide with items", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "grid",
    title: "Services",
    gridColumns: 2,
    items: [
      { title: "API", icon: "⚡", description: "Fast API" },
      { title: "DB", num: 2 },
    ],
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts bigQuote slide", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "bigQuote",
    quote: "Be the change.",
    author: "Gandhi",
    role: "Leader",
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts stats slide with change indicators", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "stats",
    title: "KPIs",
    stats: [
      { value: "99.9%", label: "Uptime", color: "success", change: "+0.1%" },
      { value: "1.2s", label: "Latency", color: "warning", change: "-0.3s" },
    ],
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts timeline slide with done items", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "timeline",
    title: "Milestones",
    items: [
      { date: "Q1", title: "Launch", done: true, color: "success" },
      { date: "Q2", title: "Scale", description: "Grow users" },
    ],
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts split slide with panels", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "split",
    left: { title: "Goals", dark: true, ratio: 60, content: [{ type: "bullets", items: ["A", "B"] }] },
    right: { title: "Notes", ratio: 40 },
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts matrix slide with axis labels", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "matrix",
    title: "SWOT",
    rows: 2,
    cols: 2,
    xAxis: { low: "Internal", high: "External" },
    yAxis: { low: "Negative", high: "Positive" },
    cells: [
      { label: "Strengths", items: ["Team"], accentColor: "success" },
      { label: "Opportunities", items: ["Market"] },
      { label: "Weaknesses", items: ["Budget"] },
      { label: "Threats", items: ["Competition"] },
    ],
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts table slide with styled cells", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "table",
    title: "Comparison",
    headers: ["Feature", "Plan A", "Plan B"],
    rows: [
      ["Storage", { text: "100GB", color: "success", bold: true }, "50GB"],
      ["Price", "$10", { text: "$5", color: "primary" }],
    ],
    rowHeaders: true,
    striped: true,
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema accepts funnel slide with stages", () => {
  const result = slideLayoutSchema.safeParse({
    layout: "funnel",
    title: "Sales Pipeline",
    stages: [
      { label: "Leads", value: "1000", color: "info" },
      { label: "Qualified", value: "300", description: "MQL" },
      { label: "Closed", value: "50", color: "success" },
    ],
  });
  assert.strictEqual(result.success, true);
});

test("slideLayoutSchema rejects unknown layout", () => {
  const result = slideLayoutSchema.safeParse({ layout: "unknown", title: "Test" });
  assert.strictEqual(result.success, false);
});

test("slideLayoutSchema rejects title slide missing required title", () => {
  const result = slideLayoutSchema.safeParse({ layout: "title" });
  assert.strictEqual(result.success, false);
});

test("slideLayoutSchema rejects columns slide missing columns array", () => {
  const result = slideLayoutSchema.safeParse({ layout: "columns", title: "Test" });
  assert.strictEqual(result.success, false);
});

// ═══════════════════════════════════════════════════════════
// MulmoSlideMedia Validation (top-level)
// ═══════════════════════════════════════════════════════════

test("mulmoSlideMediaSchema accepts complete slide media object", () => {
  const result = mulmoSlideMediaSchema.safeParse({
    type: "slide",
    theme: validTheme,
    slide: { layout: "title", title: "Hello" },
  });
  assert.strictEqual(result.success, true);
});

test("mulmoSlideMediaSchema accepts missing theme (optional)", () => {
  const result = mulmoSlideMediaSchema.safeParse({
    type: "slide",
    slide: { layout: "title", title: "Hello" },
  });
  assert.strictEqual(result.success, true);
});

test("mulmoSlideMediaSchema rejects missing slide", () => {
  const result = mulmoSlideMediaSchema.safeParse({
    type: "slide",
    theme: validTheme,
  });
  assert.strictEqual(result.success, false);
});

test("mulmoSlideMediaSchema rejects extra properties (strict mode)", () => {
  const result = mulmoSlideMediaSchema.safeParse({
    type: "slide",
    theme: validTheme,
    slide: { layout: "title", title: "Hello" },
    extra: "not allowed",
  });
  assert.strictEqual(result.success, false);
});

// ═══════════════════════════════════════════════════════════
// mulmoSlideParamsSchema Validation
// ═══════════════════════════════════════════════════════════

test("mulmoSlideParamsSchema accepts valid theme", () => {
  const result = mulmoSlideParamsSchema.safeParse({ theme: validTheme });
  assert.strictEqual(result.success, true);
});

test("mulmoSlideParamsSchema rejects missing theme", () => {
  const result = mulmoSlideParamsSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("mulmoSlideParamsSchema rejects extra properties (strict mode)", () => {
  const result = mulmoSlideParamsSchema.safeParse({ theme: validTheme, extra: "not allowed" });
  assert.strictEqual(result.success, false);
});

// ═══════════════════════════════════════════════════════════
// Preset Theme JSON File Validation
// ═══════════════════════════════════════════════════════════

const themeNames = ["dark", "pop", "warm", "creative", "minimal", "corporate"];
const themeDir = path.resolve(__dirname, "../../assets/slide_themes");

themeNames.forEach((name) => {
  test(`slide theme file ${name}.json is valid against slideThemeSchema`, () => {
    const filePath = path.resolve(themeDir, `${name}.json`);
    const content = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(content);
    const result = slideThemeSchema.safeParse(jsonData);
    assert.strictEqual(result.success, true, `Theme ${name}.json failed validation: ${JSON.stringify(result.error?.issues)}`);
  });
});
