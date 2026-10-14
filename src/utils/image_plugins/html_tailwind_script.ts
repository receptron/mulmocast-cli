import { isAnimationEnabled, isAnimationObject } from "../animation_config.js";
import { isSwipeElements, swipeElementsToHtml, swipeElementsToScript, type SwipeElement } from "../swipe_to_html.js";
import { animationRuntime } from "../../data/animationRuntime.js";

/**
 * The scripts an html_tailwind beat runs. Pure — no Node, no filesystem — because the PNG render
 * and the browser fragment path run the same author script, swipe driver and animation runtime,
 * and must assemble them the same way.
 */

const DEFAULT_ANIMATION_FPS = 30;

/** How long the final frame waits for `<video>` elements to be playable, as the PNG render does. */
export const VIDEO_LOAD_TIMEOUT_MS = 15000;

/** `tailwind_animated.html`'s rules: CSS animations and transitions stay still, so frames come from `render` alone. */
export const ANIMATED_DOCUMENT_CSS = `*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}`;

// How long scripts added to an already-loaded document wait for a module author script to define `render`.
const LATE_RENDER_WAIT_MS = 5000;
const LATE_RENDER_POLL_MS = 50;

/** Large frame count to ensure all animations reach their end state when exact duration is unknown */
export const FINAL_FRAME_TOTAL = 9000;

/** Frames per second of an enabled `animation` config. */
export const animationFps = (animation: unknown): number => (isAnimationObject(animation) ? (animation.fps ?? DEFAULT_ANIMATION_FPS) : DEFAULT_ANIMATION_FPS);

/** Join html field into a single string (handles both string and string[]) */
const joinHtml = (html: string | string[]): string => {
  return Array.isArray(html) ? html.join("\n") : html;
};

// A `</script` anywhere in the code ends the element early, even inside a string; `<\/script` is the same JS.
const neutralizeScriptTerminator = (code: string): string => code.replace(/<\/script/gi, (terminator) => `<\\${terminator.slice(1)}`);

export const buildUserScript = (script: string | string[] | undefined): string => {
  if (!script) return "";
  const code = neutralizeScriptTerminator(Array.isArray(script) ? script.join("\n") : script);
  // If user script contains ESM import/export, emit module script so imports work.
  const isModule = code.split("\n").some((line) => {
    const trimmed = line.trimStart();
    return trimmed.startsWith("import ") || trimmed.startsWith("export ");
  });
  return isModule ? `<script type="module">\n${code}\n</script>` : `<script>\n${code}\n</script>`;
};

/**
 * Resolve HTML and script from beat image data.
 * If `elements` (Swipe-style) is provided, convert to HTML + script.
 * Otherwise, use raw `html` and `script` fields.
 */
export const resolveHtmlAndScript = (imageData: {
  html?: string | string[];
  script?: string | string[];
  elements?: SwipeElement[];
}): { html: string; script: string | string[] | undefined } => {
  if (imageData.elements && Array.isArray(imageData.elements) && imageData.elements.length > 0) {
    const html = swipeElementsToHtml(imageData.elements);
    const generatedScript = swipeElementsToScript(imageData.elements);
    // Merge with user-provided script if any
    const userScript = imageData.script ? joinHtml(imageData.script as string | string[]) : "";
    const combinedScript = [generatedScript, userScript].filter(Boolean).join("\n");
    return { html, script: combinedScript || undefined };
  }
  return {
    html: joinHtml(imageData.html ?? ""),
    script: imageData.script,
  };
};

export type HtmlTailwindScriptSource = {
  script?: string | string[];
  elements?: unknown;
  animation?: unknown;
};

const inlineScript = (code: string): string => `<script>\n${neutralizeScriptTerminator(code)}\n</script>`;

/**
 * The scripts that bring an html_tailwind beat to the state its PNG shows, as `<script>` elements
 * for the end of the beat's own document; undefined when it runs none.
 *
 * Without `animation` that is the author script and swipe driver, as `tailwind.html` runs them.
 * With it, the runtime, frame state and registration `tailwind_animated.html` loads, then the
 * final frame — what `renderHTMLToFinalFrame` captures. The final frame is drawn on `load`, after
 * a module author script (deferred) has defined its `render`, as Puppeteer calls it after load;
 * scripts a host adds to an already-loaded document draw it once `render` exists (bounded wait).
 */
export const htmlTailwindDocumentScript = (image: HtmlTailwindScriptSource): string | undefined => {
  // The schema leaves `elements` unknown[]; the markup reads it through the same guard.
  const elements = isSwipeElements(image.elements) ? image.elements : undefined;
  const userScript = buildUserScript(resolveHtmlAndScript({ script: image.script, ...(elements ? { elements } : {}) }).script);
  if (!isAnimationEnabled(image.animation)) return userScript || undefined;
  const frameState = `window.__MULMO = { frame: 0, totalFrames: ${FINAL_FRAME_TOTAL}, fps: ${animationFps(image.animation)} };`;
  // On `load` when the scripts are part of the document as it loads. Added to a loaded document, a module author
  // script (one with imports above all) may run later, so wait for its `render`, bounded, before drawing. Either
  // way the videos get to be playable first, as `waitForVideosReady` lets them before the PNG's final frame.
  const finalFrame = [
    "(function () {",
    "  var whenVideosReady = function (done) {",
    '    var pending = Array.prototype.slice.call(document.querySelectorAll("video")).filter(function (video) { return video.readyState < 3; });',
    "    if (pending.length === 0) return done();",
    "    var remaining = pending.length, finished = false;",
    "    var finish = function () { if (!finished) { finished = true; done(); } };",
    `    setTimeout(finish, ${VIDEO_LOAD_TIMEOUT_MS});`,
    '    pending.forEach(function (video) { video.addEventListener("canplaythrough", function () { remaining -= 1; if (remaining <= 0) finish(); }, { once: true }); });',
    "  };",
    "  var drawFinal = function () { whenVideosReady(function () { Promise.resolve(window.renderFinal()).catch(console.error); }); };",
    "  var whenRenderReady = function (startedAt) {",
    `    if (typeof window.render === "function" || Date.now() - startedAt > ${LATE_RENDER_WAIT_MS}) drawFinal();`,
    `    else setTimeout(function () { whenRenderReady(startedAt); }, ${LATE_RENDER_POLL_MS});`,
    "  };",
    '  if (document.readyState === "complete") whenRenderReady(Date.now());',
    '  else window.addEventListener("load", drawFinal);',
    "})();",
  ].join("\n");
  return [
    inlineScript(`${animationRuntime.animation_runtime}\n${frameState}`),
    userScript,
    inlineScript(animationRuntime.data_attribute_registration),
    inlineScript(animationRuntime.auto_render),
    inlineScript(finalFrame),
  ]
    .filter(Boolean)
    .join("\n");
};

/** `documentCss` for an html_tailwind beat: the animated template's pause rules, when it animates. */
export const htmlTailwindDocumentCss = (image: HtmlTailwindScriptSource): string | undefined =>
  isAnimationEnabled(image.animation) ? ANIMATED_DOCUMENT_CSS : undefined;
