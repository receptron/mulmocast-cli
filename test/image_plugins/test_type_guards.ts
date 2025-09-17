import test from "node:test";
import assert from "node:assert";
import {
  isMulmoImageTextSlide,
  isMulmoImageMarkdown,
  isMulmoImageImage,
  isMulmoImageChart,
  isMulmoImageMermaild,
} from "../../src/utils/image_plugins/type_guards.js";

// TextSlide type guard tests
test("isMulmoImageTextSlide with valid textSlide object", () => {
  const validTextSlide = {
    type: "textSlide",
    slide: {
      title: "Test Title",
    },
  };

  const result = isMulmoImageTextSlide(validTextSlide);
  assert.strictEqual(result, true);
});

test("isMulmoImageTextSlide with complete textSlide object", () => {
  const completeTextSlide = {
    type: "textSlide",
    slide: {
      title: "Complete Slide",
      subtitle: "With subtitle",
      bullets: ["Point 1", "Point 2", "Point 3"],
    },
  };

  const result = isMulmoImageTextSlide(completeTextSlide);
  assert.strictEqual(result, true);
});

test("isMulmoImageTextSlide with invalid type", () => {
  const invalidTextSlide = {
    type: "image",
    slide: {
      title: "Test Title",
    },
  };

  const result = isMulmoImageTextSlide(invalidTextSlide);
  assert.strictEqual(result, false);
});

test("isMulmoImageTextSlide with missing slide property", () => {
  const invalidTextSlide = {
    type: "textSlide",
  };

  const result = isMulmoImageTextSlide(invalidTextSlide);
  assert.strictEqual(result, false);
});

// Markdown type guard tests
test("isMulmoImageMarkdown with valid markdown object", () => {
  const validMarkdown = {
    type: "markdown",
    markdown: ["# Hello World"],
  };

  const result = isMulmoImageMarkdown(validMarkdown);
  assert.strictEqual(result, true);
});

test("isMulmoImageMarkdown with path-based markdown", () => {
  const pathMarkdown = {
    type: "markdown",
    markdown: "123",
  };

  const result = isMulmoImageMarkdown(pathMarkdown);
  assert.strictEqual(result, true);
});

test("isMulmoImageMarkdown with invalid type", () => {
  const invalidMarkdown = {
    type: "textSlide",
    markdown: {
      kind: "text",
      text: "# Not markdown type",
    },
  };

  const result = isMulmoImageMarkdown(invalidMarkdown);
  assert.strictEqual(result, false);
});

// Image type guard tests
test("isMulmoImageImage with valid url image", () => {
  const validImage = {
    type: "image",
    source: {
      kind: "url",
      url: "https://example.com/image.jpg",
    },
  };

  const result = isMulmoImageImage(validImage);
  assert.strictEqual(result, true);
});

test("isMulmoImageImage with valid path image", () => {
  const pathImage = {
    type: "image",
    source: {
      kind: "path",
      path: "/local/image.png",
    },
  };

  const result = isMulmoImageImage(pathImage);
  assert.strictEqual(result, true);
});

test("isMulmoImageImage with invalid source kind", () => {
  const invalidImage = {
    type: "image",
    source: {
      kind: "invalid",
      data: "some data",
    },
  };

  const result = isMulmoImageImage(invalidImage);
  assert.strictEqual(result, false);
});

test("isMulmoImageImage with missing source", () => {
  const invalidImage = {
    type: "image",
  };

  const result = isMulmoImageImage(invalidImage);
  assert.strictEqual(result, false);
});

// Chart type guard tests
test("isMulmoImageChart with valid bar chart", () => {
  const validChart = {
    type: "chart",
    title: "Sales Data",
    chartData: {
      type: "bar",
      data: {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        datasets: [
          {
            data: [100, 150, 120, 180],
          },
        ],
      },
    },
  };

  const result = isMulmoImageChart(validChart);
  assert.strictEqual(result, true);
});

test("isMulmoImageChart with pie chart", () => {
  const pieChart = {
    type: "chart",
    title: "chart",
    chartData: {
      type: "pie",
      data: {
        labels: ["A", "B", "C"],
        datasets: [
          {
            data: [30, 40, 30],
          },
        ],
      },
    },
  };

  const result = isMulmoImageChart(pieChart);
  assert.strictEqual(result, true);
});

test("isMulmoImageChart with invalid chart type", () => {
  const invalidChart = {
    type: "textSlide",
    chartData: {
      type: "bar",
      data: {
        labels: ["A", "B"],
        datasets: [{ data: [1, 2] }],
      },
    },
  };

  const result = isMulmoImageChart(invalidChart);
  assert.strictEqual(result, false);
});

test("isMulmoImageChart with missing chartData", () => {
  const invalidChart = {
    type: "chart",
    title: "Missing Data",
  };

  const result = isMulmoImageChart(invalidChart);
  assert.strictEqual(result, false);
});

// Mermaid type guard tests
test("isMulmoImageMermaild with valid text-based mermaid", () => {
  const validMermaid = {
    type: "mermaid",
    title: "Flow Diagram",
    code: {
      kind: "text",
      text: "graph TD; A-->B;",
    },
  };

  const result = isMulmoImageMermaild(validMermaid);
  assert.strictEqual(result, true);
});

test("isMulmoImageMermaild with path-based mermaid", () => {
  const pathMermaid = {
    type: "mermaid",
    title: "mermaid",
    code: {
      kind: "path",
      path: "/path/to/diagram.mmd",
    },
  };

  const result = isMulmoImageMermaild(pathMermaid);
  assert.strictEqual(result, true);
});

test("isMulmoImageMermaild with appendix", () => {
  const mermaidWithAppendix = {
    type: "mermaid",
    title: "Complex Diagram",
    code: {
      kind: "text",
      text: "sequenceDiagram\n    Alice->>Bob: Hello",
    },
    appendix: ["Note over Alice: Alice thinks", "Note over Bob: Bob responds"],
  };

  const result = isMulmoImageMermaild(mermaidWithAppendix);
  assert.strictEqual(result, true);
});

test("isMulmoImageMermaild with invalid type", () => {
  const invalidMermaid = {
    type: "chart",
    code: {
      kind: "text",
      text: "graph TD; A-->B;",
    },
  };

  const result = isMulmoImageMermaild(invalidMermaid);
  assert.strictEqual(result, false);
});

test("isMulmoImageMermaild with missing code", () => {
  const invalidMermaid = {
    type: "mermaid",
    title: "Missing Code",
  };

  const result = isMulmoImageMermaild(invalidMermaid);
  assert.strictEqual(result, false);
});

// Edge cases and cross-validation tests
test("type guards with null and undefined", () => {
  assert.strictEqual(isMulmoImageTextSlide(null), false);
  assert.strictEqual(isMulmoImageTextSlide(undefined), false);
  assert.strictEqual(isMulmoImageMarkdown(null), false);
  assert.strictEqual(isMulmoImageMarkdown(undefined), false);
  assert.strictEqual(isMulmoImageImage(null), false);
  assert.strictEqual(isMulmoImageImage(undefined), false);
  assert.strictEqual(isMulmoImageChart(null), false);
  assert.strictEqual(isMulmoImageChart(undefined), false);
  assert.strictEqual(isMulmoImageMermaild(null), false);
  assert.strictEqual(isMulmoImageMermaild(undefined), false);
});

test("type guards with primitive values", () => {
  assert.strictEqual(isMulmoImageTextSlide("string"), false);
  assert.strictEqual(isMulmoImageTextSlide(123), false);
  assert.strictEqual(isMulmoImageTextSlide(true), false);
  assert.strictEqual(isMulmoImageMarkdown([]), false);
  assert.strictEqual(isMulmoImageImage({}), false);
});

test("type guards with empty objects", () => {
  const emptyObject = {};

  assert.strictEqual(isMulmoImageTextSlide(emptyObject), false);
  assert.strictEqual(isMulmoImageMarkdown(emptyObject), false);
  assert.strictEqual(isMulmoImageImage(emptyObject), false);
  assert.strictEqual(isMulmoImageChart(emptyObject), false);
  assert.strictEqual(isMulmoImageMermaild(emptyObject), false);
});

test("type guards mutual exclusivity", () => {
  const textSlideObject = {
    type: "textSlide",
    slide: { title: "Test" },
  };

  // Should only match textSlide guard
  assert.strictEqual(isMulmoImageTextSlide(textSlideObject), true);
  assert.strictEqual(isMulmoImageMarkdown(textSlideObject), false);
  assert.strictEqual(isMulmoImageImage(textSlideObject), false);
  assert.strictEqual(isMulmoImageChart(textSlideObject), false);
  assert.strictEqual(isMulmoImageMermaild(textSlideObject), false);
});
