import type { TableSlide } from "../schema.js";
import { slideHeader, renderCalloutBar } from "../utils.js";
import { renderTableCore } from "../blocks.js";

export const layoutTable = (data: TableSlide): string => {
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="px-12 mt-5 flex-1 overflow-auto">`);
  parts.push(renderTableCore(data.headers, data.rows, data.rowHeaders, data.striped));
  parts.push(`</div>`);

  if (data.callout) {
    parts.push(`<div class="mt-auto pb-4">${renderCalloutBar(data.callout)}</div>`);
  }

  return parts.join("\n");
};
