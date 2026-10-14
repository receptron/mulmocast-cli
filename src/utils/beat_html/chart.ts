import type { MulmoChartMedia } from "../../types/index.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";
import { deckSlideToHtml } from "./slide.js";
import { backgroundDecoration } from "./decoration.js";

/**
 * A chart beat as a deck `figure` slide, so it shares the `slide` beat's theme and its one
 * host code path: `slideUtilityCss`, and the `[data-mulmo-chart]` canvas driven from the
 * attribute rather than from an inline `<script>`, which neither runs through `innerHTML`
 * nor survives sanitizing.
 *
 * The PNG path still draws from its own template, so the browser and the PNG differ in look.
 */
export const chartToHtml = (image: MulmoChartMedia, options: BeatHtmlOptions): BeatHtmlFragment =>
  deckSlideToHtml(
    { layout: "figure", title: image.title, figure: { type: "chart", chartData: image.chartData } },
    undefined,
    options,
    backgroundDecoration(image, options),
  );
