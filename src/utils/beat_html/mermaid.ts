import type { MulmoMermaidMedia } from "../../types/index.js";
import { mermaidHtml } from "../image_plugins/mermaid_html.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * A mermaid beat as markup a host can inject.
 *
 * Only `code.kind === "text"` renders. The other kinds — `url`, `path`, `base64` — are
 * resolved by `MulmoMediaSourceMethods.getText`, which fetches and reads files, so they
 * cannot be reached from here and `beatToHtml` returns undefined rather than inventing a
 * placeholder. `mermaid.ts`'s own markdown dump already draws the same line.
 *
 * The markup comes from `image_plugins/mermaid_html.ts`, the module the Node render path
 * uses, so the browser and the PNG draw the same diagram.
 */
export const mermaidToHtml = (image: MulmoMermaidMedia, idPrefix: string): BeatHtmlFragment | undefined => {
  if (image.code.kind !== "text") return undefined;
  const appendix = image.appendix?.join("\n") ?? "";
  const code = `${image.code.text}\n${appendix}`.trim();
  return {
    html: mermaidHtml(code, `${idPrefix}-mermaid`, image.title || "Diagram"),
    requires: ["mermaid"],
  };
};
