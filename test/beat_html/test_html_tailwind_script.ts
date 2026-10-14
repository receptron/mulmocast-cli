import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { animationRuntime } from "../../src/data/animationRuntime.js";
import { ANIMATED_DOCUMENT_CSS } from "../../src/utils/image_plugins/html_tailwind_script.js";
import { mulmoBeatSchema } from "../../src/types/schema.js";

/**
 * An html_tailwind beat's `documentScript`: what the PNG render runs to reach the picture it
 * captures — the author script and swipe driver, and for an animation its runtime and final frame.
 */

const render = (image: Record<string, unknown>) =>
  beatToHtml(mulmoBeatSchema.parse({ text: "t", image: { type: "html_tailwind", ...image } }), { idPrefix: "beat-1" });
const swipe = [{ id: "box", text: "x", opacity: 0, to: { opacity: 1, timing: [0, 1] } }];

test("a beat that runs nothing gets no documentScript", () => {
  const fragment = render({ html: "<div>x</div>" });
  assert.deepStrictEqual(fragment, { html: "<div>x</div>" });
});

test("a script-only beat is a fragment with empty markup, not nothing; an empty beat stays undefined", () => {
  assert.deepStrictEqual(render({ script: "document.body.textContent = 'x';" }), {
    html: "",
    documentScript: "<script>\ndocument.body.textContent = 'x';\n</script>",
  });
  assert.strictEqual(render({}), undefined);
});

test("the author script comes back as a classic or module script, and never inside html", () => {
  const classic = render({ html: "<div id='x'></div>", script: "run();" });
  assert.strictEqual(classic?.documentScript, "<script>\nrun();\n</script>");
  assert.doesNotMatch(classic?.html ?? "", /<script/);
  assert.match(render({ html: "<div></div>", script: ["import x from 'https://esm.sh/x';", "x();"] })?.documentScript ?? "", /^<script type="module">/);
});

test("a </script> inside the author script cannot end its element early", () => {
  const script = render({ html: "<div></div>", script: 'console.log("</script><b>x</b>");', animation: true })?.documentScript ?? "";
  assert.match(script, /console\.log\("<\\\/script><b>x<\/b>"\);/);
  const closings = script.match(/<\/script>/gi) ?? [];
  const openings = script.match(/<script[ >]/gi) ?? [];
  assert.strictEqual(closings.length, openings.length, "every element closes exactly once");
});

test("the final frame is drawn on load, or once render exists when the scripts land in an already-loaded document", () => {
  const script = render({ html: "<div></div>", animation: true })?.documentScript ?? "";
  assert.match(script, /if \(document\.readyState === "complete"\) whenRenderReady\(Date\.now\(\)\);\s*else window\.addEventListener\("load", drawFinal\);/);
  assert.match(script, /typeof window\.render === "function" \|\| Date\.now\(\) - startedAt > 5000\) drawFinal\(\);/);
});

test("swipe elements without an animation run their driver, as the static PNG template does", () => {
  const script = render({ elements: swipe })?.documentScript ?? "";
  assert.match(script, /new MulmoAnimation\(\)/);
  assert.doesNotMatch(script, /window\.__MULMO/, "no runtime or frame state without an animation");
});

test("an animation gets the runtime, the frame state, the registration, auto-render and the final frame, in that order", () => {
  const script = render({ html: "<div data-mulmo-animate></div>", script: "var animation = new MulmoAnimation();", animation: true })?.documentScript ?? "";
  const at = (needle: string) => {
    const index = script.indexOf(needle);
    assert.ok(index >= 0, `missing: ${needle.slice(0, 60)}`);
    return index;
  };
  const order = [
    at(animationRuntime.animation_runtime.slice(0, 80)),
    at("window.__MULMO = { frame: 0, totalFrames: 9000, fps: 30 };"),
    at("var animation = new MulmoAnimation();"),
    at(animationRuntime.data_attribute_registration.slice(0, 80)),
    at(animationRuntime.auto_render.slice(0, 80)),
    at("var drawFinal"),
  ];
  assert.deepStrictEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
  assert.match(render({ html: "<div></div>", animation: { fps: 12 } })?.documentScript ?? "", /fps: 12 \};/);
});

test("the runtime the browser path inlines is the one the PNG templates read from assets/html/js", () => {
  Object.entries(animationRuntime).forEach(([name, code]) => {
    const onDisk = fs.readFileSync(path.resolve("assets/html/js", `${name}.js`), "utf8");
    assert.strictEqual(code, onDisk, `src/data/animationRuntime.ts is stale for ${name}.js — run \`yarn template\``);
    assert.doesNotMatch(code, /<\/script/i, "an inline </script> would end the element early");
  });
});

test("an animated beat pauses CSS animations and transitions through documentCss, as tailwind_animated.html does", () => {
  assert.strictEqual(render({ html: "<div></div>", animation: true })?.documentCss, ANIMATED_DOCUMENT_CSS);
  assert.strictEqual(render({ html: "<div></div>", script: "run();" })?.documentCss, undefined);
  const squash = (css: string) => css.replace(/\s+/g, "");
  const template = fs.readFileSync(path.resolve("assets/html/tailwind_animated.html"), "utf8");
  assert.ok(squash(template).includes(squash(ANIMATED_DOCUMENT_CSS)), "the template's pause rules and ANIMATED_DOCUMENT_CSS have drifted apart");
});

test("the final frame waits for videos to be playable, bounded, as waitForVideosReady does", () => {
  const script = render({ html: "<video src='a.mp4'></video>", animation: true })?.documentScript ?? "";
  assert.match(script, /video\.readyState < 3/);
  assert.match(script, /"canplaythrough"/);
  assert.match(script, /setTimeout\(finish, 15000\);/);
});
