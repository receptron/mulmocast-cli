import { marked } from "marked";
import type { MulmoTextSlideMedia } from "../../types/index.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * A textSlide as markdown: title, then subtitle, then bullets.
 * Kept separate from the HTML so `mulmo markdown` and `mulmo html` can share one
 * definition of what a textSlide *says*, independently of how it is rendered.
 */
export const textSlideToMarkdown = (image: MulmoTextSlideMedia): string => {
  const { slide } = image;
  const title = slide.title ? `# ${slide.title}\n` : "";
  const subtitle = slide.subtitle ? `## ${slide.subtitle}\n` : "";
  const bullets = (slide.bullets ?? []).map((text) => `- ${text}`).join("\n");
  return `${title}${subtitle}${bullets}`;
};

/**
 * `async: false` keeps `parse` returning a string rather than a promise, so a browser
 * host can render a beat inside a computed property instead of an effect.
 *
 * The result is NOT sanitized: marked renders raw HTML through by design, so a title of
 * `<script>alert(1)</script>` reaches the caller intact. That is the documented contract
 * on `BeatHtmlFragment.html`, and `test_text_slide.ts` pins it in both directions.
 */
export const textSlideToHtml = (image: MulmoTextSlideMedia): BeatHtmlFragment => ({
  html: marked.parse(textSlideToMarkdown(image), { async: false }),
});
