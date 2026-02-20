import type { GridSlide } from "../schema.js";
import { escapeHtml, nl2br, c, cardWrap, numBadge, iconSquare } from "../utils.js";
import { renderCardContentBlocks } from "../blocks.js";

export const layoutGrid = (data: GridSlide): string => {
  const accent = data.accentColor || "primary";
  const nCols = data.gridColumns || 3;
  const parts: string[] = [];

  parts.push(`<div class="h-[3px] bg-${c(accent)} shrink-0"></div>`);
  parts.push(`<div class="px-12 pt-5 shrink-0">`);
  parts.push(`  <h2 class="text-[42px] leading-tight font-title font-bold text-d-text">${nl2br(data.title)}</h2>`);
  parts.push(`</div>`);

  parts.push(`<div class="grid grid-cols-${nCols} gap-4 px-12 mt-5 flex-1 min-h-0 overflow-hidden content-center">`);

  (data.items || []).forEach((item) => {
    const itemAccent = item.accentColor || "primary";
    const inner: string[] = [];

    if (item.icon) {
      inner.push(`<div class="flex flex-col items-center mb-2">`);
      inner.push(`  ${iconSquare(item.icon, itemAccent)}`);
      inner.push(`</div>`);
      inner.push(`<h3 class="text-lg font-bold text-d-text text-center font-body">${escapeHtml(item.title)}</h3>`);
    } else if (item.num != null) {
      inner.push(`<div class="flex items-center gap-3">`);
      inner.push(`  ${numBadge(item.num, itemAccent)}`);
      inner.push(`  <h3 class="text-sm font-bold text-d-text font-body">${escapeHtml(item.title)}</h3>`);
      inner.push(`</div>`);
    } else {
      inner.push(`<h3 class="text-lg font-bold text-d-text font-body">${escapeHtml(item.title)}</h3>`);
    }

    if (item.description) {
      inner.push(`<p class="text-sm text-d-muted font-body mt-3">${escapeHtml(item.description)}</p>`);
    }

    if (item.content) {
      inner.push(`<div class="mt-3 space-y-3 flex-1 min-h-0 overflow-hidden flex flex-col">${renderCardContentBlocks(item.content)}</div>`);
    }

    parts.push(cardWrap(itemAccent, inner.join("\n")));
  });

  parts.push(`</div>`);

  if (data.footer) {
    parts.push(`<p class="text-xs text-d-dim font-body px-12 pb-3">${escapeHtml(data.footer)}</p>`);
  }

  return parts.join("\n");
};
