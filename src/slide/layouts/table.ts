import type { TableSlide } from "../schema.js";
import { slideHeader, renderOptionalCallout } from "../utils.js";
import { renderTableCore } from "../blocks.js";

export const layoutTable = (data: TableSlide): string => {
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="px-12 mt-5 flex-1 overflow-auto">`);
  parts.push(renderTableCore(data.headers, data.rows, data.rowHeaders, data.striped));
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};
