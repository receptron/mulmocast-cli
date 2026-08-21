import test from "node:test";
import assert from "node:assert";
import { escapeJsonForScript } from "../../src/utils/html_escape.js";

const LINE_SEPARATOR = " ";
const PARAGRAPH_SEPARATOR = " ";

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

// `&` cannot terminate a script, so it is defence in depth rather than the breakout fix —
// pinned so removing it is a decision someone makes rather than one that goes unnoticed.
test("escapeJsonForScript also escapes the ampersand", () => {
  assert.strictEqual(escapeJsonForScript(JSON.stringify({ s: "a&b" })), '{"s":"a\\u0026b"}');
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
