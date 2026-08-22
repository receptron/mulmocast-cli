import type { z } from "zod";
import type { mulmoHtmlTailwindMediaSchema } from "../../types/schema.js";
import { htmlTailwindMarkup } from "../image_plugins/html_tailwind_markup.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * An html_tailwind beat as markup a host can inject.
 *
 * The beat at rest — the same thing the Node dump path shows. This module generates no
 * `<script>`: the author's `script` FIELD, the swipe animation driver and the frame-based
 * `animation` all need script execution, which a fragment injected through `innerHTML`
 * cannot do and which the dump path has never emitted either. A `<script>` the author wrote
 * inside `html` is markup, and passes through unsanitized — see below. A beat whose only content is an animation therefore shows
 * its elements in their starting positions rather than nothing.
 *
 * The author's html is emitted as written. On this beat type markup IS the content — the
 * schema also accepts `script` — so escaping it would remove the feature rather than a
 * capability the author lacks. `BeatHtmlFragment.html` says the markup is not sanitized;
 * this is the beat type where that matters most.
 */
export const htmlTailwindToHtml = (image: z.infer<typeof mulmoHtmlTailwindMediaSchema>): BeatHtmlFragment | undefined => {
  const html = htmlTailwindMarkup(image);
  return html === "" ? undefined : { html };
};
