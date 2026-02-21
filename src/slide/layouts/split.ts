import type { SplitSlide, SplitPanel } from "../schema.js";
import { renderInlineMarkup, c, accentBar, resolveAccent } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

const resolveValign = (valign: "top" | "center" | "bottom" | undefined): string => {
  if (valign === "top") return "justify-start";
  if (valign === "bottom") return "justify-end";
  return "justify-center";
};

const buildSplitPanel = (panel: SplitPanel, fallbackAccent: string, ratio: number): string => {
  const accent = panel.accentColor || fallbackAccent;
  const bg = panel.dark ? "bg-d-card" : "";
  const vCls = resolveValign(panel.valign);
  const lines: string[] = [];
  lines.push(`<div class="${bg} flex flex-col ${vCls} px-10 py-8" style="flex: ${ratio}">`);
  if (panel.label) {
    if (panel.labelBadge) {
      lines.push(
        `  <span class="inline-block self-start px-6 py-2.5 rounded-lg bg-${c(accent)} text-lg font-bold text-white font-title mb-4">${renderInlineMarkup(panel.label)}</span>`,
      );
    } else {
      lines.push(`  <p class="text-sm font-bold text-${c(accent)} font-body mb-2">${renderInlineMarkup(panel.label)}</p>`);
    }
  }
  if (panel.title) {
    lines.push(`  <h2 class="text-[36px] leading-tight font-title font-bold text-d-text">${renderInlineMarkup(panel.title)}</h2>`);
  }
  if (panel.subtitle) {
    lines.push(`  <p class="text-base text-d-dim font-body mt-3">${renderInlineMarkup(panel.subtitle)}</p>`);
  }
  if (panel.content) {
    lines.push(`  <div class="mt-6 space-y-3">${renderContentBlocks(panel.content)}</div>`);
  }
  lines.push(`</div>`);
  return lines.join("\n");
};

export const layoutSplit = (data: SplitSlide): string => {
  const accent = resolveAccent(data.accentColor);
  const parts: string[] = [];
  parts.push(accentBar(accent));

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
