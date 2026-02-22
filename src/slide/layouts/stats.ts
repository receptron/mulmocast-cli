import type { StatsSlide } from "../schema.js";
import { renderInlineMarkup, c, resolveItemColor, resolveChangeColor, centeredSlideHeader, renderOptionalCallout } from "../utils.js";

export const layoutStats = (data: StatsSlide): string => {
  const stats = data.stats || [];
  const parts: string[] = [];

  parts.push(centeredSlideHeader(data));

  // Stats cards
  parts.push(`<div class="flex gap-6 mt-10">`);

  stats.forEach((stat) => {
    const color = resolveItemColor(stat.color, data.accentColor);
    parts.push(`<div class="flex-1 bg-d-card rounded-lg shadow-lg p-10 text-center">`);
    parts.push(`  <div class="h-[3px] bg-${c(color)} rounded-full w-12 mx-auto mb-6"></div>`);
    parts.push(`  <p class="text-[52px] font-bold text-${c(color)} font-body leading-none">${renderInlineMarkup(stat.value)}</p>`);
    parts.push(`  <p class="text-lg text-d-muted font-body mt-4">${renderInlineMarkup(stat.label)}</p>`);
    if (stat.change) {
      parts.push(`  <p class="text-base font-bold text-${c(resolveChangeColor(stat.change))} font-body mt-3">${renderInlineMarkup(stat.change)}</p>`);
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};
