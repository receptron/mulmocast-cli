import type { MulmoChartMedia } from "../../types/index.js";

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

export const chartHtml = (chartData: MulmoChartMedia["chartData"], title: string, chartId: string): string => {
  const data = JSON.stringify(chartData, null, 2);
  const heading = title || "Chart";

  return `
<div class="chart-container mb-6">
  <h3 class="text-xl font-semibold mb-4">${heading}</h3>
  <div class="w-full" style="position: relative; height: 400px;">
    <canvas id="${chartId}"></canvas>
  </div>
  <script>
    (function() {
      const ctx = document.getElementById('${chartId}').getContext('2d');
      new Chart(ctx, ${data});
    })();
  </script>
</div>`;
};
