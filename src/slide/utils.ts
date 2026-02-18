import type { SlideTheme, SlideThemeColors, AccentColorKey } from "./schema.js";

/** Escape HTML special characters */
export const escapeHtml = (s: string): string => {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/** Escape HTML and convert newlines to <br> */
export const nl2br = (s: string): string => {
  return escapeHtml(s).replace(/\n/g, "<br>");
};

/** Sanitize a value for safe use in CSS class names (alphanumeric + hyphens only) */
const sanitizeCssClass = (s: string): string => {
  return s.replace(/[^a-zA-Z0-9-]/g, "");
};

/** Sanitize a hex color value (hex digits only) */
export const sanitizeHex = (s: string): string => {
  return s.replace(/[^0-9A-Fa-f]/g, "");
};

/** Accent color key → Tailwind class segment: "primary" → "d-primary" */
export const c = (key: string): string => {
  return `d-${sanitizeCssClass(key)}`;
};

type TailwindColorKey = "bg" | "card" | "alt" | "text" | "muted" | "dim" | AccentColorKey;

const colorKeyMap: { [K in keyof SlideThemeColors]: TailwindColorKey } = {
  bg: "bg",
  bgCard: "card",
  bgCardAlt: "alt",
  text: "text",
  textMuted: "muted",
  textDim: "dim",
  primary: "primary",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  highlight: "highlight",
};

/** Build the Tailwind config JSON string for theme colors and fonts */
export const buildTailwindConfig = (theme: SlideTheme): string => {
  const colorMap: { [K in TailwindColorKey]?: string } = {};
  Object.entries(theme.colors).forEach(([k, v]) => {
    const mapped = colorKeyMap[k as keyof SlideThemeColors];
    if (mapped) {
      colorMap[mapped] = `#${v}`;
    }
  });
  return JSON.stringify({
    theme: {
      extend: {
        colors: { d: colorMap },
        fontFamily: {
          title: [theme.fonts.title, "serif"],
          body: [theme.fonts.body, "Arial", "sans-serif"],
          mono: [theme.fonts.mono, "monospace"],
        },
      },
    },
  });
};

/** Render a numbered circle badge */
export const numBadge = (num: number, colorKey: string): string => {
  return `<div class="w-10 h-10 rounded-full bg-${c(colorKey)} flex items-center justify-center shrink-0">
  <span class="text-white font-bold text-sm">${num}</span>
</div>`;
};

/** Render an icon in a square container */
export const iconSquare = (icon: string, colorKey: string): string => {
  return `<div class="w-16 h-16 bg-d-alt flex items-center justify-center rounded">
  <span class="text-2xl font-mono font-bold text-${c(colorKey)}">${escapeHtml(icon)}</span>
</div>`;
};

/** Render a card wrapper with accent top bar */
export const cardWrap = (accentColor: string, innerHtml: string, extraClass?: string): string => {
  return `<div class="bg-d-card rounded-lg shadow-lg overflow-hidden flex flex-col ${sanitizeCssClass(extraClass || "")}">
  <div class="h-[3px] bg-${c(accentColor)} shrink-0"></div>
  <div class="p-5 flex flex-col flex-1">
${innerHtml}
  </div>
</div>`;
};

/** Render a callout bar at the bottom of a slide */
export const renderCalloutBar = (obj: { text: string; label?: string; color?: string; align?: string; leftBar?: boolean }): string => {
  const color = obj.color || "warning";
  const leftBar = obj.leftBar ? `<div class="w-1 bg-${c(color)} shrink-0"></div>` : "";
  const align = obj.align === "center" ? "text-center" : "";
  const inner = obj.label
    ? `<span class="font-bold text-${c(color)}">${escapeHtml(obj.label)}:</span> <span class="text-d-muted">${escapeHtml(obj.text)}</span>`
    : `<span class="text-d-muted">${escapeHtml(obj.text)}</span>`;
  return `<div class="mx-12 bg-d-card rounded flex overflow-hidden ${align}">
  ${leftBar}
  <div class="px-4 py-3 text-sm font-body flex-1">${inner}</div>
</div>`;
};

/** Render the common slide header (accent bar + title + subtitle) */
export const slideHeader = (data: { accentColor?: string; stepLabel?: string; title: string; subtitle?: string }): string => {
  const accent = data.accentColor || "primary";
  const lines: string[] = [];
  lines.push(`<div class="h-[3px] bg-${c(accent)} shrink-0"></div>`);
  lines.push(`<div class="px-12 pt-5 shrink-0">`);
  if (data.stepLabel) {
    lines.push(`  <p class="text-sm font-bold text-${c(accent)} font-body">${escapeHtml(data.stepLabel)}</p>`);
  }
  lines.push(`  <h2 class="text-[42px] leading-tight font-title font-bold text-d-text">${nl2br(data.title)}</h2>`);
  if (data.subtitle) {
    lines.push(`  <p class="text-[15px] text-d-dim mt-2 font-body">${nl2br(data.subtitle)}</p>`);
  }
  lines.push(`</div>`);
  return lines.join("\n");
};
