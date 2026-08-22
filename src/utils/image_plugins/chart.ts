import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate } from "../html_render.js";
import { parrotingImagePath, generateUniqueId } from "./utils.js";
import { resolveCombinedStyle } from "./bg_image_util.js";
import { chartHtml, escapedChartTemplateValues, resolveChartPlugins, stringifyChartData } from "./chart_html.js";

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
    ...escapedChartTemplateValues(beat.image.title, beat.image.chartData),
    style: combinedStyle,
    chart_width: chart_width.toString(),
    chart_plugins: resolveChartPlugins(chartType),
  });
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  // main と同じ評価順（stringify → title 読み取り → id 生成）を保つ。引数式は本体より先に
  // 評価されるので、stringify を wrapper 側でやらないと throw / getter の順序が入れ替わる。
  const chartDataJson = stringifyChartData(beat.image.chartData);
  return chartHtml(chartDataJson, beat.image.title, generateUniqueId("chart"));
};

export const process = processChart;
export const path = parrotingImagePath;
export const html = dumpHtml;
