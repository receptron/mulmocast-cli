import test from "node:test";
import assert from "node:assert";
import { hasJavaScript, isChartContent, interpolate } from "../../src/utils/markdown.js";

test("hasJavaScript", async (t) => {
  await t.test("returns true for HTML with script tag", () => {
    assert.strictEqual(hasJavaScript("<html><script>alert(1)</script></html>"), true);
    assert.strictEqual(hasJavaScript('<script src="app.js"></script>'), true);
    assert.strictEqual(hasJavaScript("<SCRIPT>code</SCRIPT>"), false); // case sensitive
  });

  await t.test("returns false for HTML without script tag", () => {
    assert.strictEqual(hasJavaScript("<html><body>Hello</body></html>"), false);
    assert.strictEqual(hasJavaScript("no html at all"), false);
    assert.strictEqual(hasJavaScript(""), false);
  });

  await t.test("handles edge cases", () => {
    // Partial match should still work
    assert.strictEqual(hasJavaScript("<script"), true);
    // Text containing "script" but not a tag
    assert.strictEqual(hasJavaScript("This is a script description"), false);
  });
});

test("isChartContent", async (t) => {
  await t.test("returns true for Chart.js content", () => {
    assert.strictEqual(isChartContent('<canvas data-chart-ready="true"></canvas>'), true);
    assert.strictEqual(isChartContent("data-chart-ready"), true);
  });

  await t.test("returns false for non-chart content", () => {
    assert.strictEqual(isChartContent("<canvas></canvas>"), false);
    assert.strictEqual(isChartContent("<html><body>Hello</body></html>"), false);
    assert.strictEqual(isChartContent(""), false);
  });
});

test("interpolate", async (t) => {
  await t.test("replaces template variables", () => {
    const template = "Hello, ${name}!";
    const result = interpolate(template, { name: "World" });
    assert.strictEqual(result, "Hello, World!");
  });

  await t.test("handles multiple variables", () => {
    const template = "${greeting}, ${name}! Today is ${day}.";
    const result = interpolate(template, { greeting: "Hi", name: "Alice", day: "Monday" });
    assert.strictEqual(result, "Hi, Alice! Today is Monday.");
  });

  await t.test("handles missing variables with empty string", () => {
    const template = "Hello, ${name}!";
    const result = interpolate(template, {});
    assert.strictEqual(result, "Hello, !");
  });

  await t.test("trims whitespace in variable names", () => {
    const template = "Hello, ${ name }!";
    const result = interpolate(template, { name: "World" });
    assert.strictEqual(result, "Hello, World!");
  });

  await t.test("handles empty template", () => {
    const result = interpolate("", { name: "World" });
    assert.strictEqual(result, "");
  });

  await t.test("handles template without variables", () => {
    const template = "Hello, World!";
    const result = interpolate(template, { name: "Alice" });
    assert.strictEqual(result, "Hello, World!");
  });

  await t.test("handles special characters in values", () => {
    const template = "Query: ${query}";
    const result = interpolate(template, { query: "foo & bar <baz>" });
    assert.strictEqual(result, "Query: foo & bar <baz>");
  });
});
