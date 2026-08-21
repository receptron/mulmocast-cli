import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, generateUniqueId } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";
import { chartHtml, resolveChartPlugins } from "./chart_html.js";

export const imageType = "chart";

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

  return chartHtml(beat.image.chartData, beat.image.title, generateUniqueId("chart"));
};

export const process = processChart;
export const path = parrotingImagePath;
export const html = dumpHtml;
