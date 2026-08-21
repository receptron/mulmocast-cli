import test from "node:test";
import assert from "node:assert";
import { escapeHtml, escapeJsonForScript } from "../../src/utils/html_escape.js";

const LINE_SEPARATOR = " ";
const PARAGRAPH_SEPARATOR = " ";

test("escapeHtml neutralizes every character that can leave a text or attribute context", () => {
  assert.strictEqual(escapeHtml("&"), "&amp;");
  assert.strictEqual(escapeHtml("<"), "&lt;");
  assert.strictEqual(escapeHtml(">"), "&gt;");
  assert.strictEqual(escapeHtml('"'), "&quot;");
  assert.strictEqual(escapeHtml("'"), "&#39;");
  assert.strictEqual(escapeHtml("</h3><img src=x onerror=alert(1)>"), "&lt;/h3&gt;&lt;img src=x onerror=alert(1)&gt;");
});

// The near-miss half: a guard that escapes everything is as wrong as one that escapes nothing.
test("escapeHtml leaves everything else byte-identical", () => {
  ["", "Revenue", "売上 2026", "a-b_c 100%", "80% → 90%", "line\nbreak", "tab\there", "emoji 📊", "\\backslash", "`tick`"].forEach((value) => {
    assert.strictEqual(escapeHtml(value), value, `${JSON.stringify(value)} must pass through unchanged`);
  });
});

test("escapeHtml escapes what it is given, so calling it twice double-escapes", () => {
  assert.strictEqual(escapeHtml(escapeHtml("&")), "&amp;amp;");
});

test("escapeJsonForScript stops JSON from terminating the script that carries it", () => {
  const json = JSON.stringify({ s: "</script><script>alert(1)</script>" });
  const escaped = escapeJsonForScript(json);
  assert.ok(!escaped.includes("</script>"), "no closing script tag may survive");
  assert.ok(!escaped.includes("<"), "no raw angle bracket may survive");
});

// The browser reads this as a JavaScript object literal inside <script>, not as JSON. The
// \uXXXX escape means the same thing in both grammars, and evaluating it here would trip the
// repo's sonarjs/code-eval rule, so the JS reading is verified against a real browser instead.
test("escapeJsonForScript preserves the value a JSON reader sees", () => {
  const values: unknown[] = [
    { s: "</script>" },
    { s: `a & b < c > d` },
    { s: LINE_SEPARATOR + PARAGRAPH_SEPARATOR },
    { nested: { deep: ["<", "&", ">"] } },
    { 予算: "1<2" },
    {},
    [],
  ];
  values.forEach((value) => {
    const json = JSON.stringify(value, null, 2);
    const escaped = escapeJsonForScript(json);
    assert.deepStrictEqual(JSON.parse(escaped), value, "JSON.parse must see the same value");
  });
});

test("escapeJsonForScript leaves JSON without those characters byte-identical", () => {
  [{ type: "bar", data: { labels: ["東京", "大阪"], datasets: [{ data: [1, 2] }] } }, {}, { n: 0 }].forEach((value) => {
    const json = JSON.stringify(value, null, 2);
    assert.strictEqual(escapeJsonForScript(json), json);
  });
});

test("escapeJsonForScript covers the separators that were line terminators before ES2019", () => {
  const json = JSON.stringify({ s: LINE_SEPARATOR + PARAGRAPH_SEPARATOR });
  const escaped = escapeJsonForScript(json);
  assert.ok(!escaped.includes(LINE_SEPARATOR), "U+2028 must not survive raw");
  assert.ok(!escaped.includes(PARAGRAPH_SEPARATOR), "U+2029 must not survive raw");
});
