import type { FunnelSlide } from "../schema.js";
import { escapeHtml, c, slideHeader, renderCalloutBar } from "../utils.js";

export const layoutFunnel = (data: FunnelSlide): string => {
  const parts: string[] = [slideHeader(data)];
  const stages = data.stages || [];
  const total = stages.length;

  parts.push(`<div class="flex flex-col items-center gap-2 px-12 mt-6 flex-1">`);

  stages.forEach((stage, i) => {
    const color = stage.color || data.accentColor || "primary";
    const widthPct = 100 - (i / Math.max(total - 1, 1)) * 55;
    parts.push(`<div class="bg-${c(color)} rounded-lg flex items-center justify-between px-6 py-4" style="width: ${widthPct}%">`);
    parts.push(`  <div class="flex items-center gap-3">`);
    parts.push(`    <span class="text-base font-bold text-white font-body">${escapeHtml(stage.label)}</span>`);
    if (stage.description) {
      parts.push(`    <span class="text-sm text-white/70 font-body">${escapeHtml(stage.description)}</span>`);
    }
    parts.push(`  </div>`);
    if (stage.value) {
      parts.push(`  <span class="text-lg font-bold text-white font-body">${escapeHtml(stage.value)}</span>`);
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
