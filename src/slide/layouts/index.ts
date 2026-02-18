import type { SlideLayout } from "../schema.js";
import { layoutTitle } from "./title.js";
import { layoutColumns } from "./columns.js";
import { layoutComparison } from "./comparison.js";
import { layoutGrid } from "./grid.js";
import { layoutBigQuote } from "./big_quote.js";
import { layoutStats } from "./stats.js";
import { layoutTimeline } from "./timeline.js";
import { layoutSplit } from "./split.js";
import { layoutMatrix } from "./matrix.js";
import { layoutTable } from "./table.js";
import { layoutFunnel } from "./funnel.js";
import { escapeHtml } from "../utils.js";

/** Render the inner content of a slide (without the wrapper div) */
export const renderSlideContent = (slide: SlideLayout): string => {
  switch (slide.layout) {
    case "title":
      return layoutTitle(slide);
    case "columns":
      return layoutColumns(slide);
    case "comparison":
      return layoutComparison(slide);
    case "grid":
      return layoutGrid(slide);
    case "bigQuote":
      return layoutBigQuote(slide);
    case "stats":
      return layoutStats(slide);
    case "timeline":
      return layoutTimeline(slide);
    case "split":
      return layoutSplit(slide);
    case "matrix":
      return layoutMatrix(slide);
    case "table":
      return layoutTable(slide);
    case "funnel":
      return layoutFunnel(slide);
    default: {
      const _exhaustive: never = slide;
      return `<p class="text-white p-8">Unknown layout: ${escapeHtml(String((_exhaustive as { layout: string }).layout))}</p>`;
    }
  }
};
