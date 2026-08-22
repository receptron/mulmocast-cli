/**
 * The rule for element ids that generated markup interpolates. Pure — no Node, no
 * filesystem — because the Node render path and the browser fragment path build the same
 * markup and must agree on it.
 *
 * This enumerates what is PERMITTED rather than escaping what is not. An id drawn from this
 * set is safe in every context the markup uses it in — an HTML attribute, a JavaScript
 * string literal inside a `<script>` where HTML entities are not decoded, a CSS selector, a
 * URL fragment — so a new context cannot introduce a hole the way a per-context escaper can.
 * Escaping would also have to keep the contexts in sync: entity-escaping `<canvas id>` while
 * the `getElementById` beside it stays raw makes the two disagree and the lookup fail.
 *
 * The leading character is restricted because a CSS id selector is the strictest of those
 * contexts. Measured in a browser: `querySelector("#0")`, `"#-"`, `"#0a"` and `"#-0"` all
 * throw, while `getElementById` accepts every one of them — so an id that works today can
 * still be unusable the moment anything reaches for it with a selector. This set is a little
 * narrower than CSS allows (it rejects `-a`, which is valid) in exchange for being stateable
 * in one line.
 */
export const SAFE_ELEMENT_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export const isSafeElementId = (id: string): boolean => SAFE_ELEMENT_ID.test(id);

/**
 * Throws unless the id is safe in every context. A caller reaching this with a bad id has a
 * bug, not bad user input: values that come from a script have to be turned into an id
 * before they get here.
 */
export const assertSafeElementId = (id: string): void => {
  if (!isSafeElementId(id)) {
    throw new Error(
      `element id must match ${SAFE_ELEMENT_ID.source}, got ${JSON.stringify(id)}. Derive it from the beat's index (beat-3, not 3 — it must not start with a digit), or sanitize the beat's id, before passing it.`,
    );
  }
};
