import type { ComparisonSlide, ComparisonPanel } from "../schema.js";
import { escapeHtml, c, cardWrap, slideHeader, renderCalloutBar } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

const buildPanel = (panel: ComparisonPanel): string => {
  const accent = panel.accentColor || "primary";
  const inner: string[] = [];

  inner.push(`<h3 class="text-xl font-bold text-${c(accent)} font-body">${escapeHtml(panel.title)}</h3>`);

  if (panel.content) {
    inner.push(`<div class="mt-4 space-y-3 flex-1 min-h-0 overflow-hidden flex flex-col">`);
    inner.push(renderContentBlocks(panel.content));
    inner.push(`</div>`);
  }

  if (panel.footer) {
    if (!panel.content) inner.push(`<div class="flex-1"></div>`);
    inner.push(`<p class="text-sm text-d-dim font-body mt-3">${escapeHtml(panel.footer)}</p>`);
  }

  return cardWrap(accent, inner.join("\n"), "flex-1");
};

export const layoutComparison = (data: ComparisonSlide): string => {
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="flex gap-5 px-12 mt-5 flex-1 min-h-0 items-stretch">`);
  parts.push(buildPanel(data.left));
  parts.push(buildPanel(data.right));
  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
