import type { SplitSlide, SplitPanel } from "../schema.js";
import { escapeHtml, nl2br, c } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

const buildSplitPanel = (panel: SplitPanel, fallbackAccent: string, ratio: number): string => {
  const accent = panel.accentColor || fallbackAccent;
  const bg = panel.dark ? "bg-d-card" : "";
  const lines: string[] = [];
  lines.push(`<div class="${bg} flex flex-col justify-center px-10 py-8" style="flex: ${ratio}">`);
  if (panel.label) {
    lines.push(`  <p class="text-sm font-bold text-${c(accent)} font-body mb-2">${escapeHtml(panel.label)}</p>`);
  }
  if (panel.title) {
    lines.push(`  <h2 class="text-[36px] leading-tight font-title font-bold text-d-text">${nl2br(panel.title)}</h2>`);
  }
  if (panel.subtitle) {
    lines.push(`  <p class="text-base text-d-dim font-body mt-3">${nl2br(panel.subtitle)}</p>`);
  }
  if (panel.content) {
    lines.push(`  <div class="mt-6 space-y-3">${renderContentBlocks(panel.content)}</div>`);
  }
  lines.push(`</div>`);
  return lines.join("\n");
};

export const layoutSplit = (data: SplitSlide): string => {
  const accent = data.accentColor || "primary";
  const parts: string[] = [];
  parts.push(`<div class="h-[3px] bg-${c(accent)} shrink-0"></div>`);

  const leftRatio = data.left?.ratio || 50;
  const rightRatio = data.right?.ratio || 50;

  parts.push(`<div class="flex h-full">`);

  if (data.left) {
    parts.push(buildSplitPanel(data.left, accent, leftRatio));
  }
  if (data.right) {
    parts.push(buildSplitPanel(data.right, accent, rightRatio));
  }

  parts.push(`</div>`);
  return parts.join("\n");
};
