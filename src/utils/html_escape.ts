/**
 * Escaping for values interpolated into generated HTML. Pure — no Node, no filesystem —
 * because the Node render path and the browser fragment path embed the same values and must
 * neutralize them the same way.
 *
 * Lookups go through a Map rather than an object literal so a value naming an
 * Object.prototype member cannot resolve through the prototype chain.
 */

const HTML_ESCAPES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

/** Neutralize a value placed in HTML text or inside a quoted attribute. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => HTML_ESCAPES.get(character) ?? character);

// JSON.stringify emits these only from inside string literals, so replacing them with their
// \u escapes leaves the parsed value identical while stopping `</script>` from terminating the
// block the JSON is embedded in. U+2028 / U+2029 are valid JSON output but were line
// terminators in JavaScript source before ES2019.
const SCRIPT_JSON_ESCAPES = new Map([
  ["<", "\\u003c"],
  [">", "\\u003e"],
  ["&", "\\u0026"],
  ["\u2028", "\\u2028"],
  ["\u2029", "\\u2029"],
]);

/** Neutralize the output of JSON.stringify for embedding inside an inline `<script>`. */
export const escapeJsonForScript = (json: string): string => json.replace(/[<>&\u2028\u2029]/g, (character) => SCRIPT_JSON_ESCAPES.get(character) ?? character);
