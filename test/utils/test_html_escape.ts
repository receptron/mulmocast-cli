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

// The whole mapping, not one character at a time: this table was added after a review found
// `&` untested, and a second review then found `>` untested. Only `<` is load-bearing for the
// breakout — the rest are defence in depth — but an incomplete table is how the next one hides.
test("escapeJsonForScript escapes every character it claims, and only those", () => {
  const escapes: [string, string][] = [
    ["<", "\\u003c"],
    [">", "\\u003e"],
    ["&", "\\u0026"],
    ["\u2028", "\\u2028"],
    ["\u2029", "\\u2029"],
  ];
  escapes.forEach(([raw, escaped]) => {
    assert.strictEqual(escapeJsonForScript(JSON.stringify({ s: raw })), `{"s":"${escaped}"}`, `${JSON.stringify(raw)} must become ${escaped}`);
  });

  // The near-miss half: everything JSON.stringify can emit that is NOT in the table survives.
  ["'", '\\"', "/", "\\\\", "a", "日", "\u00a0", "\u200b"].forEach((raw) => {
    const json = JSON.stringify({ s: raw });
    assert.strictEqual(escapeJsonForScript(json), json, `${JSON.stringify(raw)} must pass through`);
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
