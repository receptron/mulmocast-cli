import test from "node:test";
import assert from "node:assert";
import { resolveCombinedStyle } from "../../src/utils/image_plugins/bg_image_util.js";

/**
 * resolveCombinedStyle is the only producer of the CSS that chart, mermaid, markdown and
 * text_slide interpolate into a <style> block, so the terminator is neutralized here rather
 * than at each of the four call sites.
 *
 * The script-controlled CSS arrives as textSlideStyle, built from textSlideParams.cssStyles.
 * A beat's own `style` is a style NAME looked up in the built-in table, not raw CSS, so it
 * cannot carry a terminator — pinned below so that stays true.
 */

const paramsWith = (textSlideStyle: string) => ({
  context: { studio: { script: {} } },
  textSlideStyle,
});

const ATTACK = 'h1{color:red}</style><img src=x onerror="pwn()">';

test("script-supplied css cannot terminate the style block it is placed in", async () => {
  const css = await resolveCombinedStyle(paramsWith(ATTACK), undefined, undefined);
  assert.ok(!/<\/style/i.test(css), "no terminator may survive");
  assert.ok(css.includes("h1{color:red}"), "the author's CSS is kept, not dropped");
});

test("a beat style is a name, so an unknown one falls back rather than being emitted", async () => {
  const css = await resolveCombinedStyle(paramsWith("h1 { color: rgb(1, 1, 1); }"), undefined, ATTACK);
  assert.strictEqual(css, "h1 { color: rgb(1, 1, 1); }", "the unknown name is replaced by the fallback style");
});

test("ordinary CSS passes through resolveCombinedStyle unchanged", async () => {
  const style = "h1 { color: rgb(9, 9, 9); }";
  assert.strictEqual(await resolveCombinedStyle(paramsWith(style), undefined, undefined), style);
});
