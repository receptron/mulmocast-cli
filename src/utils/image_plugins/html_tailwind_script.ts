import { isAnimationEnabled, isAnimationObject } from "../animation_config.js";
import { isSwipeElements, swipeElementsToHtml, swipeElementsToScript, type SwipeElement } from "../swipe_to_html.js";
import { animationRuntime } from "../../data/animationRuntime.js";

/**
 * The scripts an html_tailwind beat runs. Pure — no Node, no filesystem — because the PNG render
 * and the browser fragment path run the same author script, swipe driver and animation runtime,
 * and must assemble them the same way.
 */

const DEFAULT_ANIMATION_FPS = 30;

/** Large frame count to ensure all animations reach their end state when exact duration is unknown */
export const FINAL_FRAME_TOTAL = 9000;

/** Frames per second of an enabled `animation` config. */
export const animationFps = (animation: unknown): number => (isAnimationObject(animation) ? (animation.fps ?? DEFAULT_ANIMATION_FPS) : DEFAULT_ANIMATION_FPS);

/** Join html field into a single string (handles both string and string[]) */
const joinHtml = (html: string | string[]): string => {
  return Array.isArray(html) ? html.join("\n") : html;
};

export const buildUserScript = (script: string | string[] | undefined): string => {
  if (!script) return "";
  const code = Array.isArray(script) ? script.join("\n") : script;
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

// The runtime is ours, but a `</script>` in it would still end the element early, so it is split like any inline script.
const inlineScript = (code: string): string => `<script>\n${code.replace(/<\/script/gi, "<\\/script")}\n</script>`;

/**
 * The scripts that bring an html_tailwind beat to the state its PNG shows, as `<script>` elements
 * for the end of the beat's own document; undefined when it runs none.
 *
 * Without `animation` that is the author script and swipe driver, as `tailwind.html` runs them.
 * With it, the runtime, frame state and registration `tailwind_animated.html` loads, then the
 * final frame — what `renderHTMLToFinalFrame` captures. The final frame is drawn on `load`, after
 * a module author script (deferred) has defined its `render`, as Puppeteer calls it after load.
 */
export const htmlTailwindDocumentScript = (image: HtmlTailwindScriptSource): string | undefined => {
  // The schema leaves `elements` unknown[]; the markup reads it through the same guard.
  const elements = isSwipeElements(image.elements) ? image.elements : undefined;
  const userScript = buildUserScript(resolveHtmlAndScript({ script: image.script, ...(elements ? { elements } : {}) }).script);
  if (!isAnimationEnabled(image.animation)) return userScript || undefined;
  const frameState = `window.__MULMO = { frame: 0, totalFrames: ${FINAL_FRAME_TOTAL}, fps: ${animationFps(image.animation)} };`;
  const finalFrame = 'window.addEventListener("load", function () { Promise.resolve(window.renderFinal()).catch(console.error); });';
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
