import type { MulmoChartMedia } from "../../types/index.js";
// Deep import: the package barrel pulls in every layout and all of zod, which measured
// 551kb against 1.5kb for this file.
import { escapeHtml } from "@mulmocast/deck/lib/utils.js";
import { escapeJsonForScript } from "../html_escape.js";
import { assertSafeElementId } from "../element_id.js";

/**
 * Chart.js markup and plugin resolution for the Node render path. Pure — no Node, no
 * filesystem — so it can be tested without either. The browser path draws charts through
 * `@mulmocast/deck` instead (`beat_html/chart.ts`).
 */

/**
 * Chart.js plugin CDN URLs keyed by chart type. A Map rather than an object literal: the
 * chart type comes from the script, so an object lookup resolves `constructor` and
 * `__proto__` through the prototype chain and hands back a function.
 */
const CHART_PLUGIN_CDNS = new Map([
  ["sankey", "https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"],
  ["treemap", "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3"],
]);

/** Resolve CDN script tags for Chart.js plugins based on chart type */
export const resolveChartPlugins = (chartType: string): string => {
  const cdn = CHART_PLUGIN_CDNS.get(chartType);
  if (!cdn) return "";
  return `<script src="${cdn}"></script>`;
};

export const stringifyChartData = (chartData: MulmoChartMedia["chartData"]): string => JSON.stringify(chartData, null, 2);

/** A heading and a fixed-height canvas, followed by `trailing` — the driver script. */
const chartCard = (title: string, canvas: string, trailing: string): string => `
<div class="chart-container mb-6">
  <h3 class="text-xl font-semibold mb-4">${escapeHtml(title || "Chart")}</h3>
  <div class="w-full" style="position: relative; height: 400px;">
    ${canvas}
  </div>${trailing}
</div>`;

/** For a standalone document, where the inline script runs. */
export const chartHtml = (chartDataJson: string, title: string, chartId: string): string => {
  assertSafeElementId(chartId);
  const script = `
  <script>
    (function() {
      const ctx = document.getElementById('${chartId}').getContext('2d');
      new Chart(ctx, ${escapeJsonForScript(chartDataJson)});
    })();
  </script>`;
  return chartCard(title, `<canvas id="${chartId}"></canvas>`, script);
};

/**
 * The two values the PNG/PDF/movie template interpolates from user data, escaped for the
 * contexts it drops them into: `<h1>${title}</h1>` and `const chartData = ${chart_data};`.
 */
export const escapedChartTemplateValues = (title: string, chartData: MulmoChartMedia["chartData"]): { title: string; chart_data: string } => ({
  title: escapeHtml(title),
  chart_data: escapeJsonForScript(JSON.stringify(chartData)),
});
