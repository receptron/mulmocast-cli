import type { ColumnsSlide, Card } from "../schema.js";
import { renderInlineMarkup, c, cardWrap, numBadge, iconSquare, slideHeader, renderOptionalCallout, resolveAccent } from "../utils.js";
import { renderCardContentBlocks } from "../blocks.js";

const buildColumnCard = (col: Card): string => {
  const accent = resolveAccent(col.accentColor);
  const inner: string[] = [];

  if (col.icon) {
    inner.push(`<div class="flex flex-col items-center mb-3">`);
    inner.push(`  ${iconSquare(col.icon, accent)}`);
    inner.push(`</div>`);
    inner.push(`<h3 class="text-lg font-bold text-d-text text-center font-body">${renderInlineMarkup(col.title)}</h3>`);
  } else if (col.num != null) {
    inner.push(`<div class="flex items-center gap-3 mb-1">`);
    inner.push(`  ${numBadge(col.num, accent)}`);
    inner.push(`  <h3 class="text-lg font-bold text-d-text font-body">${renderInlineMarkup(col.title)}</h3>`);
    inner.push(`</div>`);
  } else {
    if (col.label) {
      inner.push(`<p class="text-sm font-bold text-${c(accent)} font-body">${renderInlineMarkup(col.label)}</p>`);
    }
    inner.push(`<h3 class="text-2xl font-title font-bold text-d-text mt-1">${renderInlineMarkup(col.title)}</h3>`);
  }

  if (col.content) {
    const centerCls = col.icon ? "text-center" : "";
    inner.push(`<div class="mt-4 space-y-4 flex-1 min-h-0 overflow-auto flex flex-col ${centerCls}">`);
    inner.push(renderCardContentBlocks(col.content));
    inner.push(`</div>`);
  }

  if (col.footer) {
    inner.push(`<p class="text-sm text-d-dim font-body mt-auto pt-3">${renderInlineMarkup(col.footer)}</p>`);
  }

  return cardWrap(accent, inner.join("\n"), "flex-1");
};

export const layoutColumns = (data: ColumnsSlide): string => {
  const cols = data.columns || [];
  const parts: string[] = [slideHeader(data)];

  const colElements: string[] = [];
  cols.forEach((col, i) => {
    colElements.push(buildColumnCard(col));
    if (data.showArrows && i < cols.length - 1) {
      colElements.push(`<div class="flex items-center shrink-0"><span class="text-2xl text-d-dim">\u25B6</span></div>`);
    }
  });

  parts.push(`<div class="flex gap-4 px-12 mt-5 flex-1 min-h-0 items-start">`);
  parts.push(colElements.join("\n"));
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));
  if (data.bottomText) {
    parts.push(`<p class="text-center text-sm text-d-dim font-body pb-4">${renderInlineMarkup(data.bottomText)}</p>`);
  }

  return parts.join("\n");
};
