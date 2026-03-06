import test from "node:test";
import assert from "node:assert";
import { stripHtmlTags, calculateTimingRatios } from "../../src/actions/captions.js";

// --- stripHtmlTags ---

test("stripHtmlTags: removes simple span tag", () => {
  const result = stripHtmlTags("アリババの<span style='color:#EF4444'>AI頭脳が一斉離脱</span>。");
  assert.strictEqual(result, "アリババのAI頭脳が一斉離脱。");
});

test("stripHtmlTags: removes multiple tags", () => {
  const result = stripHtmlTags("<span style='color:#EF4444'>コア</span>メンバーが<br/>同時に辞めました。");
  assert.strictEqual(result, "コアメンバーが同時に辞めました。");
});

test("stripHtmlTags: removes nested tags", () => {
  const result = stripHtmlTags("<div><span>Hello</span> <b>World</b></div>");
  assert.strictEqual(result, "Hello World");
});

test("stripHtmlTags: returns plain text unchanged", () => {
  const result = stripHtmlTags("HTMLタグなしのテキスト");
  assert.strictEqual(result, "HTMLタグなしのテキスト");
});

test("stripHtmlTags: handles empty string", () => {
  const result = stripHtmlTags("");
  assert.strictEqual(result, "");
});

test("stripHtmlTags: handles self-closing tags", () => {
  const result = stripHtmlTags("改行の<br/>前後");
  assert.strictEqual(result, "改行の前後");
});

test("stripHtmlTags: handles tags with complex attributes", () => {
  const result = stripHtmlTags("テスト<span style='color:#F59E0B;font-weight:bold' class='highlight'>重要</span>です");
  assert.strictEqual(result, "テスト重要です");
});

test("stripHtmlTags: preserves literal angle brackets in math expressions", () => {
  const result = stripHtmlTags("2 < 3 > 1");
  assert.strictEqual(result, "2 < 3 > 1");
});

test("stripHtmlTags: preserves comparison operators", () => {
  const result = stripHtmlTags("x<10 and y>5");
  assert.strictEqual(result, "x<10 and y>5");
});

test("stripHtmlTags: preserves generic syntax", () => {
  const result = stripHtmlTags("vector<int> data");
  assert.strictEqual(result, "vector<int> data");
});

// --- calculateTimingRatios ---

test("calculateTimingRatios: plain text calculates by length", () => {
  const ratios = calculateTimingRatios(["abc", "abcdef"]);
  // 3/(3+6)=1/3, 6/(3+6)=2/3
  assert.strictEqual(ratios.length, 2);
  assertApprox(ratios[0], 1 / 3);
  assertApprox(ratios[1], 2 / 3);
});

test("calculateTimingRatios: HTML tags are excluded from length calculation", () => {
  const texts = [
    "アリババの<span style='color:#EF4444'>AI頭脳が一斉離脱</span>。",
    "オープンソースAI\n「<span style='color:#F59E0B'>Qwen</span>」の責任者が\nXで離職を発表しました。",
  ];
  const ratios = calculateTimingRatios(texts);
  // stripped: "アリババのAI頭脳が一斉離脱。" (15) / "オープンソースAI\n「Qwen」の責任者が\nXで離職を発表しました。" (34)
  const len1 = 15;
  const len2 = 34;
  assertApprox(ratios[0], len1 / (len1 + len2));
  assertApprox(ratios[1], len2 / (len1 + len2));
});

test("calculateTimingRatios: same HTML different text lengths produce correct ratios", () => {
  const texts = ["<span style='color:red'>短い</span>", "<span style='color:red'>これは長いテキストです</span>"];
  const ratios = calculateTimingRatios(texts);
  // stripped: "短い" (2) / "これは長いテキストです" (11)
  assertApprox(ratios[0], 2 / 13);
  assertApprox(ratios[1], 11 / 13);
});

test("calculateTimingRatios: all empty texts produce equal ratios", () => {
  const ratios = calculateTimingRatios(["", "", ""]);
  ratios.forEach((r) => assertApprox(r, 1 / 3));
});

test("calculateTimingRatios: single element returns [1]", () => {
  const ratios = calculateTimingRatios(["Hello"]);
  assert.strictEqual(ratios.length, 1);
  assertApprox(ratios[0], 1);
});

test("calculateTimingRatios: ratios sum to 1", () => {
  const texts = ["<b>First</b> segment.", "Second <em>segment</em> is longer.", "<span class='x'>Third</span>."];
  const ratios = calculateTimingRatios(texts);
  const sum = ratios.reduce((a, b) => a + b, 0);
  assertApprox(sum, 1);
});

// Helper
const assertApprox = (actual: number, expected: number, tolerance = 0.0001) => {
  assert(Math.abs(actual - expected) < tolerance, `Expected ~${expected}, got ${actual}`);
};
