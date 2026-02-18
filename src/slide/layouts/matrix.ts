import type { MatrixSlide } from "../schema.js";
import { escapeHtml, c, cardWrap, slideHeader } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

export const layoutMatrix = (data: MatrixSlide): string => {
  const parts: string[] = [slideHeader(data)];
  const rows = data.rows || 2;
  const cols = data.cols || 2;
  const cells = data.cells || [];

  parts.push(`<div class="flex flex-1 px-12 mt-4 gap-2">`);

  if (data.yAxis) {
    parts.push(`<div class="flex flex-col justify-between items-center w-6 shrink-0 py-4">`);
    parts.push(`  <span class="text-xs text-d-dim font-body [writing-mode:vertical-lr] rotate-180">${escapeHtml(data.yAxis.high || "")}</span>`);
    if (data.yAxis.label) {
      parts.push(`  <span class="text-xs font-bold text-d-muted font-body [writing-mode:vertical-lr] rotate-180">${escapeHtml(data.yAxis.label)}</span>`);
    }
    parts.push(`  <span class="text-xs text-d-dim font-body [writing-mode:vertical-lr] rotate-180">${escapeHtml(data.yAxis.low || "")}</span>`);
    parts.push(`</div>`);
  }

  parts.push(`<div class="flex-1 flex flex-col gap-3">`);

  Array.from({ length: rows }).forEach((_, r) => {
    parts.push(`<div class="flex gap-3 flex-1">`);
    Array.from({ length: cols }).forEach((_, ci) => {
      const idx = r * cols + ci;
      const cell = cells[idx] || { label: "" };
      const accent = cell.accentColor || "primary";
      const inner: string[] = [];
      inner.push(`<h3 class="text-lg font-bold text-${c(accent)} font-body">${escapeHtml(cell.label)}</h3>`);
      if (cell.items) {
        inner.push(`<ul class="mt-2 space-y-1 text-sm text-d-muted font-body">`);
        cell.items.forEach((item) => {
          inner.push(`  <li class="flex gap-2"><span class="text-d-dim shrink-0">&bull;</span><span>${escapeHtml(item)}</span></li>`);
        });
        inner.push(`</ul>`);
      }
      if (cell.content) {
        inner.push(`<div class="mt-2 space-y-2">${renderContentBlocks(cell.content)}</div>`);
      }
      parts.push(cardWrap(accent, inner.join("\n"), "flex-1"));
    });
    parts.push(`</div>`);
  });

  if (data.xAxis) {
    parts.push(`<div class="flex justify-between px-2 mt-1">`);
    parts.push(`  <span class="text-xs text-d-dim font-body">${escapeHtml(data.xAxis.low || "")}</span>`);
    if (data.xAxis.label) {
      parts.push(`  <span class="text-xs font-bold text-d-muted font-body">${escapeHtml(data.xAxis.label)}</span>`);
    }
    parts.push(`  <span class="text-xs text-d-dim font-body">${escapeHtml(data.xAxis.high || "")}</span>`);
    parts.push(`</div>`);
  }

  parts.push(`</div>`);
  parts.push(`</div>`);
  return parts.join("\n");
};
