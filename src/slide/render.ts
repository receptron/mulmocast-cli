import type { SlideTheme, SlideLayout } from "./schema.js";
import { escapeHtml, buildTailwindConfig, sanitizeHex } from "./utils.js";
import { renderSlideContent } from "./layouts/index.js";

/** Generate a complete HTML document for a single slide */
export const generateSlideHTML = (theme: SlideTheme, slide: SlideLayout): string => {
  const content = renderSlideContent(slide);
  const twConfig = buildTailwindConfig(theme.colors, theme.fonts);

  const slideStyle = "style" in slide ? (slide as { style?: { bgColor?: string; footer?: string } }).style : undefined;
  const bgCls = slideStyle?.bgColor ? "" : "bg-d-bg";
  const inlineStyle = slideStyle?.bgColor ? ` style="background-color:#${sanitizeHex(slideStyle.bgColor)}"` : "";
  const footer = slideStyle?.footer ? `\n<p class="absolute bottom-2 right-4 text-xs text-d-dim font-body">${escapeHtml(slideStyle.footer)}</p>` : "";

  const scriptEnd = "<" + "/script>";
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<script src="https://cdn.tailwindcss.com">${scriptEnd}
<script>tailwind.config = ${twConfig}${scriptEnd}
<style>
  html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
</style>
</head>
<body class="h-full">
<div class="relative overflow-hidden ${bgCls} w-full h-full flex flex-col"${inlineStyle}>
${content}${footer}
</div>
</body>
</html>`;
};
