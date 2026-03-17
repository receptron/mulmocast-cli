import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, generateUniqueId } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";

export const imageType = "chart";

/** Chart.js plugin CDN URLs keyed by chart type */
const CHART_PLUGIN_CDNS: Record<string, string> = {
  sankey: "https://cdn.jsdelivr.net/npm/chartjs-chart-sankey",
  treemap: "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3",
};

/** Resolve CDN script tags for Chart.js plugins based on chart type */
const resolveChartPlugins = (chartType: string): string => {
  const cdn = CHART_PLUGIN_CDNS[chartType];
  if (!cdn) return "";
  return `<script src="${cdn}"></script>`;
};

const processChart = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const chartType = beat.image.chartData.type as string;
  const isCircular = chartType === "pie" || chartType === "doughnut" || chartType === "polarArea" || chartType === "radar";
  const chart_width = isCircular ? Math.min(canvasSize.width, canvasSize.height) * 0.75 : canvasSize.width * 0.75;
  const combinedStyle = await resolveCombinedStyle(params, beat.image.backgroundImage, beat.image.style);
  const template = getHTMLFile("chart");
  const htmlData = interpolate(template, {
    title: beat.image.title,
    style: combinedStyle,
    chart_width: chart_width.toString(),
    chart_data: JSON.stringify(beat.image.chartData),
    chart_plugins: resolveChartPlugins(chartType),
  });
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const chartData = JSON.stringify(beat.image.chartData, null, 2);
  const title = beat.image.title || "Chart";
  const chartId = generateUniqueId("chart");

  return `
<div class="chart-container mb-6">
  <h3 class="text-xl font-semibold mb-4">${title}</h3>
  <div class="w-full" style="position: relative; height: 400px;">
    <canvas id="${chartId}"></canvas>
  </div>
  <script>
    (function() {
      const ctx = document.getElementById('${chartId}').getContext('2d');
      new Chart(ctx, ${chartData});
    })();
  </script>
</div>`;
};

export const process = processChart;
export const path = parrotingImagePath;
export const html = dumpHtml;
