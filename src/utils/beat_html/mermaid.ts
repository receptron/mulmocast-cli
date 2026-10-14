import type { MulmoMermaidMedia } from "../../types/index.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";
import { deckSlideToHtml } from "./slide.js";
import { backgroundDecoration } from "./decoration.js";

/**
 * A mermaid beat as a deck `figure` slide — see `chart.ts` for why deck draws it.
 *
 * Only `code.kind === "text"` renders. The other kinds — `url`, `path`, `base64` — are
 * resolved by `MulmoMediaSourceMethods.getText`, which fetches and reads files, so they
 * cannot be reached from here and `beatToHtml` returns undefined rather than inventing a
 * placeholder. `mermaid.ts`'s own markdown dump already draws the same line.
 */
export const mermaidToHtml = (image: MulmoMermaidMedia, options: BeatHtmlOptions): BeatHtmlFragment | undefined => {
  if (image.code.kind !== "text") return undefined;
  const appendix = image.appendix?.join("\n") ?? "";
  const code = `${image.code.text}\n${appendix}`.trim();
  return deckSlideToHtml(
    { layout: "figure", title: image.title || "Diagram", figure: { type: "mermaid", code } },
    undefined,
    options,
    backgroundDecoration(image, options),
  );
};
