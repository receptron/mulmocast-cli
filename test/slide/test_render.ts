import test from "node:test";
import assert from "node:assert";
import { generateSlideHTML } from "../../src/slide/render.js";
import type { SlideTheme, SlideLayout } from "../../src/slide/schema.js";

const theme: SlideTheme = {
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

// ═══════════════════════════════════════════════════════════
// HTML document structure
// ═══════════════════════════════════════════════════════════

test("generateSlideHTML: returns complete HTML document with DOCTYPE", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "Test" });
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes("<html"));
  assert.ok(html.includes("</html>"));
});

test("generateSlideHTML: includes Tailwind CDN script tag", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "Test" });
  assert.ok(html.includes('src="https://cdn.tailwindcss.com"'));
});

test("generateSlideHTML: includes tailwind.config with theme colors", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "Test" });
  assert.ok(html.includes("tailwind.config"));
  assert.ok(html.includes("#0F172A"));
  assert.ok(html.includes("#3B82F6"));
  assert.ok(html.includes("#8B5CF6"));
});

test("generateSlideHTML: includes font-family configuration", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "Test" });
  assert.ok(html.includes("Georgia"));
  assert.ok(html.includes("Calibri"));
  assert.ok(html.includes("Consolas"));
});

test("generateSlideHTML: wraps slide content in full-viewport container", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "Test" });
  assert.ok(html.includes("w-full h-full"));
  assert.ok(html.includes("bg-d-bg"));
});

// ═══════════════════════════════════════════════════════════
// SlideStyle support
// ═══════════════════════════════════════════════════════════

test("generateSlideHTML: applies slide-level bgColor override", () => {
  const slide: SlideLayout = {
    layout: "title",
    title: "Custom BG",
    style: { bgColor: "FF0000" },
  };
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes('background-color:#FF0000"'));
  assert.ok(!html.includes("bg-d-bg"));
});

test("generateSlideHTML: renders footer text when style.footer is set", () => {
  const slide: SlideLayout = {
    layout: "title",
    title: "With Footer",
    style: { footer: "Source: Company Report 2026" },
  };
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes("Source: Company Report 2026"));
  assert.ok(html.includes("absolute bottom-2"));
});

test("generateSlideHTML: omits footer when not set", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "No Footer" });
  assert.ok(!html.includes("absolute bottom-2"));
});

// ═══════════════════════════════════════════════════════════
// All 11 layouts generate valid HTML
// ═══════════════════════════════════════════════════════════

const allLayouts: SlideLayout[] = [
  { layout: "title", title: "T" },
  { layout: "columns", title: "T", columns: [{ title: "A" }] },
  { layout: "comparison", title: "T", left: { title: "L" }, right: { title: "R" } },
  { layout: "grid", title: "T", items: [{ title: "A" }] },
  { layout: "bigQuote", quote: "Q" },
  { layout: "stats", title: "T", stats: [{ value: "1", label: "L" }] },
  { layout: "timeline", title: "T", items: [{ date: "D", title: "T" }] },
  { layout: "split", left: { title: "L" } },
  { layout: "matrix", title: "T", cells: [{ label: "A" }] },
  { layout: "table", title: "T", headers: ["H"], rows: [["V"]] },
  { layout: "funnel", title: "T", stages: [{ label: "S" }] },
];

allLayouts.forEach((slide) => {
  test(`generateSlideHTML: generates valid HTML for ${slide.layout} layout`, () => {
    const html = generateSlideHTML(theme, slide);
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes('src="https://cdn.tailwindcss.com"'));
    assert.ok(html.includes("</html>"));
    // Should not contain undefined or null text
    assert.ok(!html.includes(">undefined<"));
    assert.ok(!html.includes(">null<"));
  });
});

// ═══════════════════════════════════════════════════════════
// Light theme support
// ═══════════════════════════════════════════════════════════

test("generateSlideHTML: works with light theme colors", () => {
  const lightTheme: SlideTheme = {
    colors: {
      bg: "FFFFFF",
      bgCard: "F8FAFC",
      bgCardAlt: "F1F5F9",
      text: "0F172A",
      textMuted: "475569",
      textDim: "94A3B8",
      primary: "2563EB",
      accent: "7C3AED",
      success: "059669",
      warning: "D97706",
      danger: "DC2626",
      info: "0891B2",
      highlight: "DB2777",
    },
    fonts: { title: "Trebuchet MS", body: "Calibri", mono: "Consolas" },
  };
  const html = generateSlideHTML(lightTheme, { layout: "title", title: "Light" });
  assert.ok(html.includes("#FFFFFF"));
  assert.ok(html.includes("Trebuchet MS"));
});

// ═══════════════════════════════════════════════════════════
// CDN script conditional injection
// ═══════════════════════════════════════════════════════════

test("generateSlideHTML: does NOT include Chart.js CDN when no chart blocks", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "No Chart" });
  assert.ok(!html.includes("chart.js"));
});

test("generateSlideHTML: does NOT include Mermaid CDN when no mermaid blocks", () => {
  const html = generateSlideHTML(theme, { layout: "title", title: "No Mermaid" });
  assert.ok(!html.includes("mermaid"));
});

test("generateSlideHTML: includes Chart.js CDN when chart block exists", () => {
  const slide: SlideLayout = {
    layout: "columns",
    title: "Chart Slide",
    columns: [
      {
        title: "Revenue",
        content: [{ type: "chart", chartData: { type: "bar", data: { labels: ["Q1"], datasets: [{ data: [100] }] } } }],
      },
    ],
  };
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes('src="https://cdn.jsdelivr.net/npm/chart.js"'));
});

test("generateSlideHTML: includes Mermaid CDN with dark theme for dark bg", () => {
  const slide: SlideLayout = {
    layout: "split",
    left: { content: [{ type: "mermaid", code: "graph TD\n  A-->B" }] },
  };
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes("mermaid.min.js"));
  assert.ok(html.includes("theme:'dark'"));
});

test("generateSlideHTML: includes Mermaid CDN with default theme for light bg", () => {
  const lightTheme: SlideTheme = {
    colors: {
      bg: "FFFFFF",
      bgCard: "F8FAFC",
      bgCardAlt: "F1F5F9",
      text: "0F172A",
      textMuted: "475569",
      textDim: "94A3B8",
      primary: "2563EB",
      accent: "7C3AED",
      success: "059669",
      warning: "D97706",
      danger: "DC2626",
      info: "0891B2",
      highlight: "DB2777",
    },
    fonts: { title: "Trebuchet MS", body: "Calibri", mono: "Consolas" },
  };
  const slide: SlideLayout = {
    layout: "split",
    left: { content: [{ type: "mermaid", code: "graph TD\n  A-->B" }] },
  };
  const html = generateSlideHTML(lightTheme, slide);
  assert.ok(html.includes("theme:'default'"));
});

test("generateSlideHTML: includes both CDNs when chart and mermaid blocks coexist", () => {
  const slide: SlideLayout = {
    layout: "comparison",
    title: "Both",
    left: { title: "Chart", content: [{ type: "chart", chartData: { type: "pie", data: {} } }] },
    right: { title: "Mermaid", content: [{ type: "mermaid", code: "graph LR\n  A-->B" }] },
  };
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes("chart.js"));
  assert.ok(html.includes("mermaid.min.js"));
});
