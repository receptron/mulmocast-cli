import type { StatsSlide } from "../schema.js";
import { escapeHtml, c, slideHeader, renderCalloutBar } from "../utils.js";

export const layoutStats = (data: StatsSlide): string => {
  const parts: string[] = [slideHeader(data)];
  const stats = data.stats || [];

  parts.push(`<div class="flex gap-6 px-12 mt-8 flex-1 items-start">`);

  stats.forEach((stat) => {
    const color = stat.color || data.accentColor || "primary";
    parts.push(`<div class="flex-1 bg-d-card rounded-lg shadow-lg p-8 text-center">`);
    parts.push(`  <div class="h-[3px] bg-${c(color)} rounded-full w-12 mx-auto mb-6"></div>`);
    parts.push(`  <p class="text-[48px] font-bold text-${c(color)} font-body leading-none">${escapeHtml(stat.value)}</p>`);
    parts.push(`  <p class="text-base text-d-muted font-body mt-3">${escapeHtml(stat.label)}</p>`);
    if (stat.change) {
      const changeColor = stat.change.startsWith("+") ? "success" : "danger";
      parts.push(`  <p class="text-sm font-bold text-${c(changeColor)} font-body mt-2">${escapeHtml(stat.change)}</p>`);
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
