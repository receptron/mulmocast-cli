import type { ComparisonSlide, ComparisonPanel } from "../schema.js";
import { renderInlineMarkup, c, cardWrap, slideHeader, renderOptionalCallout, resolveAccent } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

const buildPanel = (panel: ComparisonPanel): string => {
  const accent = resolveAccent(panel.accentColor);
  const inner: string[] = [];

  inner.push(`<h3 class="text-xl font-bold text-${c(accent)} font-body">${renderInlineMarkup(panel.title)}</h3>`);

  if (panel.content) {
    inner.push(`<div class="mt-5 space-y-4 flex-1 min-h-0 overflow-auto flex flex-col">`);
    inner.push(renderContentBlocks(panel.content));
    inner.push(`</div>`);
  }

  if (panel.footer) {
    inner.push(`<p class="text-sm text-d-dim font-body mt-auto pt-3">${renderInlineMarkup(panel.footer)}</p>`);
  }

  return cardWrap(accent, inner.join("\n"), "flex-1");
};

export const layoutComparison = (data: ComparisonSlide): string => {
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="flex gap-5 px-12 mt-5 flex-1 min-h-0 items-start">`);
  parts.push(buildPanel(data.left));
  parts.push(buildPanel(data.right));
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};
