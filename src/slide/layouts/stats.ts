import type { StatsSlide } from "../schema.js";
import { escapeHtml, nl2br, c, renderCalloutBar } from "../utils.js";

export const layoutStats = (data: StatsSlide): string => {
  const accent = data.accentColor || "primary";
  const stats = data.stats || [];
  const parts: string[] = [];

  parts.push(`<div class="h-[3px] bg-${c(accent)} shrink-0"></div>`);
  parts.push(`<div class="flex-1 flex flex-col justify-center px-12 min-h-0">`);

  // Header inside centering wrapper
  if (data.stepLabel) {
    parts.push(`<p class="text-sm font-bold text-${c(accent)} font-body">${escapeHtml(data.stepLabel)}</p>`);
  }
  parts.push(`<h2 class="text-[42px] leading-tight font-title font-bold text-d-text">${nl2br(data.title)}</h2>`);
  if (data.subtitle) {
    parts.push(`<p class="text-[15px] text-d-dim mt-2 font-body">${nl2br(data.subtitle)}</p>`);
  }

  // Stats cards
  parts.push(`<div class="flex gap-6 mt-10">`);

  stats.forEach((stat) => {
    const color = stat.color || data.accentColor || "primary";
    parts.push(`<div class="flex-1 bg-d-card rounded-lg shadow-lg p-10 text-center">`);
    parts.push(`  <div class="h-[3px] bg-${c(color)} rounded-full w-12 mx-auto mb-6"></div>`);
    parts.push(`  <p class="text-[52px] font-bold text-${c(color)} font-body leading-none">${escapeHtml(stat.value)}</p>`);
    parts.push(`  <p class="text-lg text-d-muted font-body mt-4">${escapeHtml(stat.label)}</p>`);
    if (stat.change) {
      const changeColor = stat.change.startsWith("+") ? "success" : "danger";
      parts.push(`  <p class="text-base font-bold text-${c(changeColor)} font-body mt-3">${escapeHtml(stat.change)}</p>`);
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
