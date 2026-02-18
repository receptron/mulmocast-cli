import type { TableSlide, TableCellValue } from "../schema.js";
import { escapeHtml, c, slideHeader, renderCalloutBar } from "../utils.js";

const resolveCellColor = (cellObj: { color?: string }, isRowHeader: boolean): string => {
  if (cellObj.color) return `text-${c(cellObj.color)}`;
  if (isRowHeader) return "text-d-text";
  return "text-d-muted";
};

const renderCellValue = (cell: TableCellValue, isRowHeader: boolean): string => {
  const cellObj = typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
  const colorCls = resolveCellColor(cellObj, isRowHeader);
  const boldCls = cellObj.bold || isRowHeader ? "font-bold" : "";
  return `<td class="px-4 py-3 text-sm ${colorCls} ${boldCls} font-body border-b border-d-alt">${escapeHtml(cellObj.text)}</td>`;
};

export const layoutTable = (data: TableSlide): string => {
  const parts: string[] = [slideHeader(data)];
  const headers = data.headers || [];
  const rows = data.rows || [];
  const striped = data.striped !== false;

  parts.push(`<div class="px-12 mt-5 flex-1 overflow-auto">`);
  parts.push(`<table class="w-full border-collapse">`);

  parts.push(`<thead>`);
  parts.push(`<tr>`);
  headers.forEach((h) => {
    parts.push(`  <th class="text-left px-4 py-3 text-sm font-bold text-d-text font-body border-b-2 border-d-alt">${escapeHtml(h)}</th>`);
  });
  parts.push(`</tr>`);
  parts.push(`</thead>`);

  parts.push(`<tbody>`);
  rows.forEach((row, ri) => {
    const bgCls = striped && ri % 2 === 1 ? "bg-d-alt/30" : "";
    parts.push(`<tr class="${bgCls}">`);
    (row || []).forEach((cell, ci) => {
      const isRowHeader = ci === 0 && !!data.rowHeaders;
      parts.push(`  ${renderCellValue(cell, isRowHeader)}`);
    });
    parts.push(`</tr>`);
  });
  parts.push(`</tbody>`);

  parts.push(`</table>`);
  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
