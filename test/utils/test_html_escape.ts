import test from "node:test";
import assert from "node:assert";
import { escapeJsonForScript, neutralizeStyleTerminator } from "../../src/utils/html_escape.js";

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

// A <style> element holds raw text, so `</style` is the ONLY sequence that can end it — no
// entities, no comments, no other spelling. That is why enumerating the bad form is complete
// here, unlike the script case where the value itself has to be neutralized.
test("neutralizeStyleTerminator catches the terminator in every casing and shape", () => {
  ["</style>", "</STYLE>", "</StYlE>", "</style >", "</style\n>", "</style/"].forEach((terminator) => {
    const out = neutralizeStyleTerminator(`h1{color:red}${terminator}<img src=x onerror="pwn()">`);
    assert.ok(!/<\/style/i.test(out), `${JSON.stringify(terminator)} must not survive`);
    assert.ok(out.startsWith("h1{color:red}"), "the author's CSS before it is untouched");
  });
});

test("neutralizeStyleTerminator catches every occurrence, not just the first", () => {
  const out = neutralizeStyleTerminator("a</style>b</STYLE>c");
  assert.strictEqual(out, "a\\3c /style>b\\3c /STYLE>c");
});

// Verified in a browser: the escaped form computes to the value "</style>", so CSS that
// deliberately contains the text keeps working.
test("neutralizeStyleTerminator uses a CSS escape, so the value is preserved", () => {
  assert.strictEqual(neutralizeStyleTerminator('h1::after{content:"</style>"}'), 'h1::after{content:"\\3c /style>"}');
});

// Deliberately broader than the exploitable set. Measured in a browser, injection needs
// `</style` followed by `>` or HTML whitespace (space, tab, LF, CR, FF); `</stylex` and a
// trailing `</style` at end of input do not inject. Escaping those anyway costs nothing —
// the CSS escape preserves the value — and it removes any dependence on getting the
// terminator set exactly right in every browser.
test("neutralizeStyleTerminator over-matches on purpose, and the value survives it", () => {
  assert.strictEqual(neutralizeStyleTerminator('a{content:"</stylesheet>"}'), 'a{content:"\\3c /stylesheet>"}');
  assert.strictEqual(neutralizeStyleTerminator("h1{}</style"), "h1{}\\3c /style");
});

test("neutralizeStyleTerminator leaves ordinary CSS byte-identical", () => {
  [
    "",
    "h1 { color: rgb(9, 9, 9); }",
    "body { background-image: url('data:image/png;base64,AAA'); }",
    "/* <style> in a comment is not a terminator */ p { margin: 0 }",
    "@media (max-width: 100px) { .a > .b { content: '<'; } }",
    ".x::before { content: 'style'; }",
  ].forEach((css) => {
    assert.strictEqual(neutralizeStyleTerminator(css), css, `${JSON.stringify(css)} must pass through`);
  });
});
