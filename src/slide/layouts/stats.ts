import type { StatsSlide } from "../schema.js";
import { renderInlineMarkup, c, renderCalloutBar, renderHeaderText } from "../utils.js";

export const layoutStats = (data: StatsSlide): string => {
  const accent = data.accentColor || "primary";
  const stats = data.stats || [];
  const parts: string[] = [];

  parts.push(`<div class="h-[3px] bg-${c(accent)} shrink-0"></div>`);
  parts.push(`<div class="flex-1 flex flex-col justify-center px-12 min-h-0">`);

  // Header inside centering wrapper
  parts.push(renderHeaderText(data));

  // Stats cards
  parts.push(`<div class="flex gap-6 mt-10">`);

  stats.forEach((stat) => {
    const color = stat.color || data.accentColor || "primary";
    parts.push(`<div class="flex-1 bg-d-card rounded-lg shadow-lg p-10 text-center">`);
    parts.push(`  <div class="h-[3px] bg-${c(color)} rounded-full w-12 mx-auto mb-6"></div>`);
    parts.push(`  <p class="text-[52px] font-bold text-${c(color)} font-body leading-none">${renderInlineMarkup(stat.value)}</p>`);
    parts.push(`  <p class="text-lg text-d-muted font-body mt-4">${renderInlineMarkup(stat.label)}</p>`);
    if (stat.change) {
      const changeColor = /\+/.test(stat.change) ? "success" : "danger";
      parts.push(`  <p class="text-base font-bold text-${c(changeColor)} font-body mt-3">${renderInlineMarkup(stat.change)}</p>`);
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);
  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
