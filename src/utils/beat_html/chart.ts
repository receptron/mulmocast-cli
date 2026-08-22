import type { MulmoChartMedia } from "../../types/index.js";
import { chartFragmentHtml, chartPluginCdns, chartTypeOf } from "../image_plugins/chart_html.js";
import type { BeatHtmlFragment } from "./type.js";

/**
 * A chart beat as markup a host can inject.
 *
 * The config rides on the canvas as `data-mulmo-chart` rather than in an inline `<script>`:
 * a script injected through `innerHTML` does not execute, and does not survive sanitizing
 * either. The attribute shape matches `@mulmocast/deck`'s, so a host that already drives
 * `[data-mulmo-chart]` for slides drives this too without a second code path.
 *
 * The markup itself comes from `image_plugins/chart_html.ts`, the same module the Node
 * render path uses — a second copy of it would drift, and the two paths have to draw the
 * same chart.
 */
export const chartToHtml = (image: MulmoChartMedia, idPrefix: string): BeatHtmlFragment => {
  const plugins = chartPluginCdns(chartTypeOf(image.chartData));
  return {
    html: chartFragmentHtml(image.chartData, image.title, `${idPrefix}-chart`),
    requires: ["chart"],
    ...(plugins.length > 0 ? { chartPlugins: plugins } : {}),
  };
};
