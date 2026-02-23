import type { SlideTheme, SlideLayout } from "./schema.js";
import { escapeHtml, buildTailwindConfig, sanitizeHex, detectBlockTypes } from "./utils.js";
import { renderSlideContent } from "./layouts/index.js";

/** Pre-resolved branding data (all sources converted to data URLs) */
export type ResolvedBranding = {
  logo?: { dataUrl: string; position: string; width: number };
  backgroundImage?: { dataUrl: string; size: string; opacity: number };
};

/** Determine if a hex color is dark (luminance < 128) */
const isDarkBg = (hex: string): boolean => {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};

/** Build CDN script tags for chart/mermaid when needed */
const buildCdnScripts = (theme: SlideTheme, slide: SlideLayout): string => {
  const { hasChart, hasMermaid } = detectBlockTypes(slide);
  const scripts: string[] = [];
  if (hasChart) {
    scripts.push('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
  }
  if (hasMermaid) {
    const mermaidTheme = isDarkBg(theme.colors.bg) ? "dark" : "default";
    scripts.push(`<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'${mermaidTheme}'})</script>`);
  }
  return scripts.join("\n");
};

/** Map branding logo position to Tailwind CSS classes */
const logoPositionClasses: Record<string, string> = {
  "top-left": "top-5 left-6",
  "top-right": "top-5 right-6",
  "bottom-left": "bottom-5 left-6",
  "bottom-right": "bottom-5 right-6",
};

/** Render branding background image layer */
const renderBrandingBackground = (branding: ResolvedBranding): string => {
  if (!branding.backgroundImage) return "";
  const { dataUrl, size, opacity } = branding.backgroundImage;
  const bgSize = size === "fill" ? "100% 100%" : size;
  return `<div class="absolute inset-0 z-0" style="background-image:url('${dataUrl}');background-size:${bgSize};background-position:center;background-repeat:no-repeat;opacity:${opacity}"></div>`;
};

/** Render branding logo element */
const renderBrandingLogo = (branding: ResolvedBranding): string => {
  if (!branding.logo) return "";
  const { dataUrl, position, width } = branding.logo;
  const posClasses = logoPositionClasses[position] ?? logoPositionClasses["top-right"];
  return `<img class="absolute ${posClasses} z-10" src="${dataUrl}" width="${width}" style="pointer-events:none">`;
};

/** Generate a complete HTML document for a single slide */
export const generateSlideHTML = (theme: SlideTheme, slide: SlideLayout, reference?: string, branding?: ResolvedBranding): string => {
  const content = renderSlideContent(slide);
  const twConfig = buildTailwindConfig(theme);
  const cdnScripts = buildCdnScripts(theme, slide);

  const slideStyle = slide.style;
  const bgCls = slideStyle?.bgColor ? "" : "bg-d-bg";
  const inlineStyle = slideStyle?.bgColor ? ` style="background-color:#${sanitizeHex(slideStyle.bgColor)}"` : "";
  const footer = slideStyle?.footer ? `<p class="absolute bottom-2 right-4 text-xs text-d-dim font-body">${escapeHtml(slideStyle.footer)}</p>` : "";
  const referenceHtml = reference
    ? `<div class="mt-auto px-4 pb-2"><p class="text-sm text-d-muted font-body opacity-80">${escapeHtml(reference)}</p></div>`
    : "";

  const brandingBg = branding ? renderBrandingBackground(branding) : "";
  const brandingLogo = branding ? renderBrandingLogo(branding) : "";

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = ${twConfig}</script>
${cdnScripts}
<style>
  html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
</style>
</head>
<body class="h-full">
<div class="relative overflow-hidden ${bgCls} w-full h-full flex flex-col"${inlineStyle}>
${brandingBg}
${content}
${referenceHtml}
${footer}
${brandingLogo}
</div>
</body>
</html>`;
};
