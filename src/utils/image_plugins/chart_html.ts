import type { MulmoChartMedia } from "../../types/index.js";
// Deep import: the package barrel pulls in every layout and all of zod, which measured
// 551kb against 1.5kb for this file, and the browser fragment path bundles this module.
import { escapeHtml } from "@mulmocast/deck/lib/utils.js";
import { escapeJsonForScript } from "../html_escape.js";
import { assertSafeElementId } from "../element_id.js";

/**
 * Chart.js markup and plugin resolution. Pure — no Node, no filesystem — because both the
 * Node render path and the browser fragment path draw the same chart and must draw it the
 * same way.
 *
 * The canvas id is a parameter rather than generated here: the Node path renders once to a
 * PNG so a random id is fine, while the browser path re-renders and needs the same beat to
 * produce the same markup, or a host diffing fragments sees every chart change identity on
 * every render.
 */

/** Chart.js plugin CDN URLs keyed by chart type */
const CHART_PLUGIN_CDNS: Record<string, string> = {
  sankey: "https://cdn.jsdelivr.net/npm/chartjs-chart-sankey",
  treemap: "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3",
};

/** Resolve CDN script tags for Chart.js plugins based on chart type */
export const resolveChartPlugins = (chartType: string): string => {
  const cdn = CHART_PLUGIN_CDNS[chartType];
  if (!cdn) return "";
  return `<script src="${cdn}"></script>`;
};

export const stringifyChartData = (chartData: MulmoChartMedia["chartData"]): string => JSON.stringify(chartData, null, 2);

/** The card both paths draw: a heading and a fixed-height canvas. `trailing` is where the
 * document path puts its driver script; the fragment path leaves it empty. */
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
 * For a host that injects the markup into its own page, where an injected `<script>`
 * neither survives sanitizing nor executes via innerHTML. The config rides on the canvas
 * instead, in the shape `@mulmocast/deck` already uses so one host runtime drives both.
 */
export const chartFragmentHtml = (chartData: MulmoChartMedia["chartData"], title: string, chartId: string): string => {
  assertSafeElementId(chartId);
  const config = escapeHtml(JSON.stringify(chartData));
  return chartCard(title, `<canvas id="${chartId}" data-chart-ready="false" data-mulmo-chart="${config}"></canvas>`, "");
};

/** `chartData` is a free record, so the type may be absent or not a string. */
export const chartTypeOf = (chartData: MulmoChartMedia["chartData"]): string => {
  const type = chartData?.type;
  return typeof type === "string" ? type : "";
};

/** The Chart.js plugin CDNs a chart type needs, for a host that loads them once per page. */
export const chartPluginCdns = (chartType: string): string[] => {
  const cdn = CHART_PLUGIN_CDNS[chartType];
  return cdn ? [cdn] : [];
};

/**
 * The two values the PNG/PDF/movie template interpolates from user data, escaped for the
 * contexts it drops them into: `<h1>${title}</h1>` and `const chartData = ${chart_data};`.
 */
export const escapedChartTemplateValues = (title: string, chartData: MulmoChartMedia["chartData"]): { title: string; chart_data: string } => ({
  title: escapeHtml(title),
  chart_data: escapeJsonForScript(JSON.stringify(chartData)),
});
