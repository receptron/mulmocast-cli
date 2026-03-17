import type { WaterfallSlide } from "../schema.js";
import { renderInlineMarkup, c, slideHeader, renderOptionalCallout } from "../utils.js";

/** Height of the chart area as percentage of available space */
const CHART_HEIGHT_PCT = 75;

export const layoutWaterfall = (data: WaterfallSlide): string => {
  const parts: string[] = [slideHeader(data)];
  const items = data.items || [];

  const positions = buildWaterfallPositions(items);
  const globalMax = Math.max(...positions.map((p) => p.top));
  const globalMin = Math.min(...positions.map((p) => p.bottom));
  const range = globalMax - globalMin || 1;

  parts.push(`<div class="flex gap-1 px-12 mt-4 flex-1" style="min-height: 0">`);

  items.forEach((item, i) => {
    const pos = positions[i];
    const isTotal = item.isTotal ?? false;
    const isPositive = item.value >= 0;
    const color = resolveBarColor(item.color, isTotal, isPositive);

    const bottomPct = ((pos.bottom - globalMin) / range) * CHART_HEIGHT_PCT;
    const heightPct = Math.max(((pos.top - pos.bottom) / range) * CHART_HEIGHT_PCT, 1.5);
    const topOfBar = bottomPct + heightPct;
    const labelTopPct = 100 - topOfBar;
    const formattedValue = formatValue(item.value, data.unit, isTotal);

    parts.push(`<div class="flex-1 relative" style="height: 100%">`);
    // Value label (above bar)
    parts.push(
      `  <p class="absolute w-full text-xs font-bold text-d-text font-body text-center" style="top: ${labelTopPct - 4}%">${renderInlineMarkup(formattedValue)}</p>`,
    );
    // Bar (absolute positioned from bottom)
    parts.push(`  <div class="absolute left-1 right-1 bg-${c(color)} rounded-t" style="bottom: ${bottomPct}%; height: ${heightPct}%"></div>`);
    // Bottom label
    parts.push(
      `  <p class="absolute bottom-0 w-full text-xs text-d-muted font-body text-center" style="transform: translateY(100%)">${renderInlineMarkup(item.label)}</p>`,
    );
    parts.push(`</div>`);
  });

  parts.push(`</div>`);
  // Labels area
  parts.push(`<div class="h-10 shrink-0"></div>`);
  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};

type WaterfallPosition = { top: number; bottom: number };

const buildWaterfallPositions = (items: WaterfallSlide["items"]): WaterfallPosition[] => {
  let runningTotal = 0;
  return items.map((item) => {
    if (item.isTotal) {
      runningTotal = item.value;
      return { top: Math.max(item.value, 0), bottom: Math.min(item.value, 0) };
    }
    const prevTotal = runningTotal;
    runningTotal += item.value;
    if (item.value >= 0) {
      return { top: runningTotal, bottom: prevTotal };
    }
    return { top: prevTotal, bottom: runningTotal };
  });
};

const resolveBarColor = (itemColor: string | undefined, isTotal: boolean, isPositive: boolean): string => {
  if (itemColor) return itemColor;
  if (isTotal) return "primary";
  return isPositive ? "success" : "danger";
};

const formatValue = (value: number, unit: string | undefined, isTotal: boolean): string => {
  const prefix = !isTotal && value > 0 ? "+" : "";
  const suffix = unit ? ` ${unit}` : "";
  return `${prefix}${value}${suffix}`;
};
