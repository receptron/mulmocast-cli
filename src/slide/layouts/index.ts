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

type LayoutRenderer = (data: never) => string;

const layoutMap: Record<string, LayoutRenderer> = {
  title: layoutTitle as LayoutRenderer,
  columns: layoutColumns as LayoutRenderer,
  comparison: layoutComparison as LayoutRenderer,
  grid: layoutGrid as LayoutRenderer,
  bigQuote: layoutBigQuote as LayoutRenderer,
  stats: layoutStats as LayoutRenderer,
  timeline: layoutTimeline as LayoutRenderer,
  split: layoutSplit as LayoutRenderer,
  matrix: layoutMatrix as LayoutRenderer,
  table: layoutTable as LayoutRenderer,
  funnel: layoutFunnel as LayoutRenderer,
};

/** Render the inner content of a slide (without the wrapper div) */
export const renderSlideContent = (slide: SlideLayout): string => {
  const renderer = layoutMap[slide.layout];
  if (!renderer) {
    return `<p class="text-white p-8">Unknown layout: ${escapeHtml(slide.layout)}</p>`;
  }
  return renderer(slide as never);
};
