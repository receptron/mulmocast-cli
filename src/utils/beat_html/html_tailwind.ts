import type { z } from "zod";
import type { mulmoHtmlTailwindMediaSchema } from "../../types/schema.js";
import { htmlTailwindMarkup } from "../image_plugins/html_tailwind_markup.js";
import { htmlTailwindDocumentScript } from "../image_plugins/html_tailwind_script.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * An html_tailwind beat as markup a host can inject.
 *
 * `html` is the beat at rest — the same thing the Node dump path shows, with no generated
 * `<script>`: a fragment injected through `innerHTML` cannot run one. The author's `script`
 * FIELD, the swipe driver and the frame-based `animation` come back separately as
 * `documentScript`, for a host that gives the beat a document of its own and can run them; it
 * brings the beat to what the PNG shows (an animation's final frame). A `<script>` the author
 * wrote inside `html` is markup, and passes through unsanitized — see below.
 *
 * The author's html is emitted as written. On this beat type markup IS the content — the
 * schema also accepts `script` — so escaping it would remove the feature rather than a
 * capability the author lacks. `BeatHtmlFragment.html` says the markup is not sanitized;
 * this is the beat type where that matters most.
 */
export const htmlTailwindToHtml = (image: z.infer<typeof mulmoHtmlTailwindMediaSchema>): BeatHtmlFragment | undefined => {
  const html = htmlTailwindMarkup(image);
  const documentScript = htmlTailwindDocumentScript(image);
  // A script-only beat draws itself, so it is a fragment with empty markup rather than nothing.
  if (documentScript) return { html, documentScript };
  return html === "" ? undefined : { html };
};
