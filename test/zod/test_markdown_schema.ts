import test from "node:test";
import assert from "node:assert";
import { markdownLayoutSchema, mulmoMarkdownMediaSchema, row2Schema, grid2x2Schema } from "../../src/types/schema.js";

// ============================================
// row2Schema tests
// ============================================

test("row2Schema: valid with two strings", () => {
  const data = row2Schema.safeParse(["left content", "right content"]);
  assert(data.success);
  assert.deepStrictEqual(data.data, ["left content", "right content"]);
});

test("row2Schema: valid with string arrays", () => {
  const data = row2Schema.safeParse([
    ["line1", "line2"],
    ["line3", "line4"],
  ]);
  assert(data.success);
});

test("row2Schema: valid with mixed string and array", () => {
  const data = row2Schema.safeParse(["single string", ["array", "of", "strings"]]);
  assert(data.success);
});

test("row2Schema: invalid with single element", () => {
  const data = row2Schema.safeParse(["only one"]);
  assert(!data.success);
});

test("row2Schema: invalid with three elements", () => {
  const data = row2Schema.safeParse(["one", "two", "three"]);
  assert(!data.success);
});

test("row2Schema: invalid with empty array", () => {
  const data = row2Schema.safeParse([]);
  assert(!data.success);
});

test("row2Schema: valid with empty strings", () => {
  const data = row2Schema.safeParse(["", ""]);
  assert(data.success);
});

test("row2Schema: valid with empty string arrays", () => {
  const data = row2Schema.safeParse([[], []]);
  assert(data.success);
});

test("row2Schema: valid with unicode content", () => {
  const data = row2Schema.safeParse(["日本語", "中文"]);
  assert(data.success);
});

test("row2Schema: valid with emoji", () => {
  const data = row2Schema.safeParse(["🎉", "📝"]);
  assert(data.success);
});

test("row2Schema: valid with multiline content", () => {
  const data = row2Schema.safeParse([
    `Line 1
Line 2`,
    "single",
  ]);
  assert(data.success);
});

test("row2Schema: valid with very long content", () => {
  const longString = "x".repeat(10000);
  const data = row2Schema.safeParse([longString, longString]);
  assert(data.success);
});

test("row2Schema: invalid with number elements", () => {
  const data = row2Schema.safeParse([123, 456]);
  assert(!data.success);
});

test("row2Schema: invalid with object elements", () => {
  const data = row2Schema.safeParse([{ text: "a" }, { text: "b" }]);
  assert(!data.success);
});

test("row2Schema: invalid with null elements", () => {
  const data = row2Schema.safeParse([null, null]);
  assert(!data.success);
});

test("row2Schema: invalid with undefined elements", () => {
  const data = row2Schema.safeParse([undefined, undefined]);
  assert(!data.success);
});

// ============================================
// grid2x2Schema tests
// ============================================

test("grid2x2Schema: valid with four strings", () => {
  const data = grid2x2Schema.safeParse(["top-left", "top-right", "bottom-left", "bottom-right"]);
  assert(data.success);
  assert.deepStrictEqual(data.data, ["top-left", "top-right", "bottom-left", "bottom-right"]);
});

test("grid2x2Schema: valid with string arrays", () => {
  const data = grid2x2Schema.safeParse([
    ["a", "b"],
    ["c", "d"],
    ["e", "f"],
    ["g", "h"],
  ]);
  assert(data.success);
});

test("grid2x2Schema: valid with mixed string and arrays", () => {
  const data = grid2x2Schema.safeParse(["string", ["array"], "string2", ["array2"]]);
  assert(data.success);
});

test("grid2x2Schema: invalid with three elements", () => {
  const data = grid2x2Schema.safeParse(["one", "two", "three"]);
  assert(!data.success);
});

test("grid2x2Schema: invalid with five elements", () => {
  const data = grid2x2Schema.safeParse(["one", "two", "three", "four", "five"]);
  assert(!data.success);
});

test("grid2x2Schema: invalid with empty array", () => {
  const data = grid2x2Schema.safeParse([]);
  assert(!data.success);
});

test("grid2x2Schema: valid with empty strings", () => {
  const data = grid2x2Schema.safeParse(["", "", "", ""]);
  assert(data.success);
});

test("grid2x2Schema: valid with empty arrays", () => {
  const data = grid2x2Schema.safeParse([[], [], [], []]);
  assert(data.success);
});

test("grid2x2Schema: valid with nested arrays of different lengths", () => {
  const data = grid2x2Schema.safeParse([["single"], ["one", "two", "three"], [], ["a", "b"]]);
  assert(data.success);
});

test("grid2x2Schema: valid with unicode content", () => {
  const data = grid2x2Schema.safeParse(["日本語", "中文", "한국어", "English"]);
  assert(data.success);
});

test("grid2x2Schema: valid with markdown syntax", () => {
  const data = grid2x2Schema.safeParse(["# Title", "**bold**", "- list", "`code`"]);
  assert(data.success);
});

test("grid2x2Schema: invalid with number elements", () => {
  const data = grid2x2Schema.safeParse([1, 2, 3, 4]);
  assert(!data.success);
});

test("grid2x2Schema: invalid with nested objects", () => {
  const data = grid2x2Schema.safeParse([{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }]);
  assert(!data.success);
});

// ============================================
// markdownLayoutSchema tests - row-2 layout
// ============================================

test("markdownLayoutSchema: valid row-2 minimal", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["left", "right"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with string arrays", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": [
      ["a", "b"],
      ["c", "d"],
    ],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with mixed content", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["simple", ["array", "content"]],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with empty strings", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["", ""],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with unicode", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["日本語コンテンツ", "English content"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with emoji", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["🎉 Welcome", "📊 Charts"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with markdown syntax", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["# Title\n- item1\n- item2", "**bold** and _italic_"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with very long content", () => {
  const longContent = "x".repeat(10000);
  const data = markdownLayoutSchema.safeParse({
    "row-2": [longContent, longContent],
  });
  assert(data.success);
});

// ============================================
// markdownLayoutSchema tests - 2x2 layout
// ============================================

test("markdownLayoutSchema: valid 2x2 minimal", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": ["tl", "tr", "bl", "br"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with string arrays", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": [["a"], ["b", "c"], ["d", "e", "f"], []],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with empty strings", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": ["", "", "", ""],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with unicode", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": ["日本語", "中文", "한국어", "English"],
  });
  assert(data.success);
});

// ============================================
// markdownLayoutSchema tests - invalid cases
// ============================================

test("markdownLayoutSchema: invalid without main layout", () => {
  const data = markdownLayoutSchema.safeParse({
    header: "Just header",
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid with only sidebar-left", () => {
  const data = markdownLayoutSchema.safeParse({
    "sidebar-left": "Just sidebar",
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid empty object", () => {
  const data = markdownLayoutSchema.safeParse({});
  assert(!data.success);
});

// Note: With loose validation, both row-2 and 2x2 are allowed (union matches first)
test("markdownLayoutSchema: both row-2 and 2x2 are allowed (loose validation)", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["a", "b"],
    "2x2": ["c", "d", "e", "f"],
  });
  assert(data.success); // Loose validation - implementation should handle this
});

// Note: Schema uses loose validation - extra properties are not rejected at schema level
test("markdownLayoutSchema: extra properties are not rejected (loose validation)", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["a", "b"],
    footer: "extra property allowed",
  });
  assert(data.success); // Loose validation allows extra properties
});

test("markdownLayoutSchema: invalid row-2 with one element", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["only one"],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid row-2 with three elements", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": ["one", "two", "three"],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid 2x2 with three elements", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": ["one", "two", "three"],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid 2x2 with five elements", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": ["one", "two", "three", "four", "five"],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid row-2 content type (number)", () => {
  const data = markdownLayoutSchema.safeParse({
    "row-2": [123, 456],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid 2x2 content type (object)", () => {
  const data = markdownLayoutSchema.safeParse({
    "2x2": [{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }],
  });
  assert(!data.success);
});

test("markdownLayoutSchema: invalid with null", () => {
  const data = markdownLayoutSchema.safeParse(null);
  assert(!data.success);
});

test("markdownLayoutSchema: invalid with array instead of object", () => {
  const data = markdownLayoutSchema.safeParse([["a", "b"]]);
  assert(!data.success);
});

test("markdownLayoutSchema: invalid with string instead of object", () => {
  const data = markdownLayoutSchema.safeParse("invalid");
  assert(!data.success);
});

// ============================================
// markdownLayoutSchema tests - frame + main combinations
// ============================================

test("markdownLayoutSchema: valid row-2 with header", () => {
  const data = markdownLayoutSchema.safeParse({
    header: "Title",
    "row-2": ["a", "b"],
  });
  assert(data.success);
  assert.strictEqual(data.data?.header, "Title");
});

test("markdownLayoutSchema: valid row-2 with header array", () => {
  const data = markdownLayoutSchema.safeParse({
    header: ["Title", "Subtitle"],
    "row-2": ["a", "b"],
  });
  assert(data.success);
  assert.deepStrictEqual(data.data?.header, ["Title", "Subtitle"]);
});

test("markdownLayoutSchema: valid row-2 with sidebar-left", () => {
  const data = markdownLayoutSchema.safeParse({
    "sidebar-left": "Navigation",
    "row-2": ["main", "aside"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with sidebar-left array", () => {
  const data = markdownLayoutSchema.safeParse({
    "sidebar-left": ["Menu 1", "Menu 2", "Menu 3"],
    "row-2": ["content", "more"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid row-2 with header and sidebar-left", () => {
  const data = markdownLayoutSchema.safeParse({
    header: "Page Title",
    "sidebar-left": "Nav",
    "row-2": ["main content", "sidebar content"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with header", () => {
  const data = markdownLayoutSchema.safeParse({
    header: "Grid Title",
    "2x2": ["a", "b", "c", "d"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with sidebar-left", () => {
  const data = markdownLayoutSchema.safeParse({
    "sidebar-left": ["item1", "item2"],
    "2x2": ["q1", "q2", "q3", "q4"],
  });
  assert(data.success);
});

test("markdownLayoutSchema: valid 2x2 with header and sidebar-left", () => {
  const data = markdownLayoutSchema.safeParse({
    header: ["Main", "Sub"],
    "sidebar-left": "Menu",
    "2x2": ["tl", "tr", "bl", "br"],
  });
  assert(data.success);
});

// ============================================
// mulmoMarkdownMediaSchema tests
// ============================================

test("mulmoMarkdownMediaSchema: valid with row-2 layout", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["left content", "right content"],
    },
  });
  assert(data.success);
  assert.strictEqual(data.data?.type, "markdown");
});

test("mulmoMarkdownMediaSchema: valid with 2x2 layout", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "2x2": ["a", "b", "c", "d"],
    },
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid with style", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["left", "right"],
    },
    style: "dark-theme",
  });
  assert(data.success);
  assert.strictEqual(data.data?.style, "dark-theme");
});

test("mulmoMarkdownMediaSchema: valid with empty style", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["a", "b"],
    },
    style: "",
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid without style", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "2x2": ["1", "2", "3", "4"],
    },
  });
  assert(data.success);
  assert.strictEqual(data.data?.style, undefined);
});

test("mulmoMarkdownMediaSchema: invalid without type", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    markdown: {
      "row-2": ["a", "b"],
    },
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with wrong type value", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "image",
    markdown: {
      "row-2": ["a", "b"],
    },
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with wrong type (text instead of markdown)", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "text",
    markdown: {
      "row-2": ["a", "b"],
    },
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid without markdown", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with null markdown", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: null,
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with string markdown", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: "this should be an object",
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with array markdown", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: [["a", "b"]],
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with extra property", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["a", "b"],
    },
    extraProp: "should fail",
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with number style", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["a", "b"],
    },
    style: 123,
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with object style", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["a", "b"],
    },
    style: { name: "dark" },
  });
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with array instead of object", () => {
  const data = mulmoMarkdownMediaSchema.safeParse([{ type: "markdown", markdown: { "row-2": ["a", "b"] } }]);
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with empty object", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({});
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with null", () => {
  const data = mulmoMarkdownMediaSchema.safeParse(null);
  assert(!data.success);
});

test("mulmoMarkdownMediaSchema: invalid with undefined", () => {
  const data = mulmoMarkdownMediaSchema.safeParse(undefined);
  assert(!data.success);
});

// ============================================
// Integration: complex valid cases
// ============================================

test("mulmoMarkdownMediaSchema: valid complex row-2 with arrays", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": [
        ["# Left Panel", "Content here", "- item 1", "- item 2"],
        ["# Right Panel", "More content"],
      ],
    },
    style: "presentation-style",
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid complex 2x2 with mixed content", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "2x2": ["# Quadrant 1\nSimple text", ["Line 1", "Line 2", "Line 3"], "", ["**Bold**", "_Italic_", "`Code`"]],
    },
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid with Japanese content", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["# 左パネル\n日本語コンテンツ", "# 右パネル\n詳細情報"],
    },
    style: "japanese-style",
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid with code blocks", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      "row-2": ["```typescript\nconst x = 1;\n```", "```python\nx = 1\n```"],
    },
  });
  assert(data.success);
});

test("mulmoMarkdownMediaSchema: valid with full layout options", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      header: "Presentation Title",
      "sidebar-left": ["Section 1", "Section 2", "Section 3"],
      "row-2": ["# Main Content\n- Point 1\n- Point 2", "## Sidebar\nAdditional info"],
    },
    style: "presentation",
  });
  assert(data.success);
  assert.strictEqual(data.data?.markdown.header, "Presentation Title");
});

test("mulmoMarkdownMediaSchema: valid 2x2 with header and sidebar-left", () => {
  const data = mulmoMarkdownMediaSchema.safeParse({
    type: "markdown",
    markdown: {
      header: ["Main Title", "Subtitle"],
      "sidebar-left": "Navigation",
      "2x2": ["Q1", "Q2", "Q3", "Q4"],
    },
  });
  assert(data.success);
});
