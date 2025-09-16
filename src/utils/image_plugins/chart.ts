import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../markdown.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "chart";

const processChart = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, textSlideStyle } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const isCircular =
    beat.image.chartData.type === "pie" ||
    beat.image.chartData.type === "doughnut" ||
    beat.image.chartData.type === "polarArea" ||
    beat.image.chartData.type === "radar";
  const chart_width = isCircular ? Math.min(canvasSize.width, canvasSize.height) * 0.75 : canvasSize.width * 0.75;
  const template = getHTMLFile("chart");
  const htmlData = interpolate(template, {
    title: beat.image.title,
    style: textSlideStyle,
    chart_width: chart_width.toString(),
    chart_data: JSON.stringify(beat.image.chartData),
  });
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const chartData = JSON.stringify(beat.image.chartData, null, 2);
  const title = beat.image.title || "Chart";
  const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;

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
