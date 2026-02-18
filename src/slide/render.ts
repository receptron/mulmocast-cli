import type { SlideTheme, SlideLayout } from "./schema.js";
import { escapeHtml, buildTailwindConfig, sanitizeHex, detectBlockTypes } from "./utils.js";
import { renderSlideContent } from "./layouts/index.js";

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

/** Generate a complete HTML document for a single slide */
export const generateSlideHTML = (theme: SlideTheme, slide: SlideLayout): string => {
  const content = renderSlideContent(slide);
  const twConfig = buildTailwindConfig(theme);
  const cdnScripts = buildCdnScripts(theme, slide);

  const slideStyle = slide.style;
  const bgCls = slideStyle?.bgColor ? "" : "bg-d-bg";
  const inlineStyle = slideStyle?.bgColor ? ` style="background-color:#${sanitizeHex(slideStyle.bgColor)}"` : "";
  const footer = slideStyle?.footer ? `<p class="absolute bottom-2 right-4 text-xs text-d-dim font-body">${escapeHtml(slideStyle.footer)}</p>` : "";

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
${content}
${footer}
</div>
</body>
</html>`;
};
