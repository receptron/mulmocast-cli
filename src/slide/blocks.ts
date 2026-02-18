import type { ContentBlock } from "./schema.js";
import { escapeHtml, nl2br, c } from "./utils.js";

/** Render a single content block to HTML */
export const renderContentBlock = (block: ContentBlock): string => {
  switch (block.type) {
    case "text":
      return renderText(block);
    case "bullets":
      return renderBullets(block);
    case "code":
      return renderCode(block);
    case "callout":
      return renderCallout(block);
    case "metric":
      return renderMetric(block);
    case "divider":
      return renderDivider(block);
    case "image":
      return renderImage(block);
    default:
      return `<p class="text-sm text-d-muted font-body">[unknown block type]</p>`;
  }
};

/** Render an array of content blocks to HTML */
export const renderContentBlocks = (blocks: ContentBlock[]): string => {
  return blocks.map(renderContentBlock).join("\n");
};

const resolveTextColor = (block: ContentBlock & { type: "text" }): string => {
  if (block.color) return `text-${c(block.color)}`;
  if (block.dim) return "text-d-dim";
  return "text-d-muted";
};

const resolveAlign = (align: string | undefined): string => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "";
};

const renderText = (block: ContentBlock & { type: "text" }): string => {
  const color = resolveTextColor(block);
  const bold = block.bold ? "font-bold" : "";
  const size = block.fontSize !== undefined && block.fontSize >= 18 ? "text-xl" : "text-[15px]";
  const alignCls = resolveAlign(block.align);
  return `<p class="${size} ${color} ${bold} ${alignCls} font-body leading-relaxed">${nl2br(block.value)}</p>`;
};

const renderBullets = (block: ContentBlock & { type: "bullets" }): string => {
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items
    .map((item, i) => {
      const marker = block.ordered ? `${i + 1}.` : escapeHtml(block.icon || "\u2022");
      return `  <li class="flex gap-2"><span class="text-d-dim shrink-0">${marker}</span><span>${escapeHtml(item)}</span></li>`;
    })
    .join("\n");
  return `<${tag} class="space-y-2 text-[15px] text-d-muted font-body">\n${items}\n</${tag}>`;
};

const renderCode = (block: ContentBlock & { type: "code" }): string => {
  return `<pre class="bg-[#0D1117] p-4 rounded text-sm font-mono text-d-dim leading-relaxed whitespace-pre-wrap">${escapeHtml(block.code)}</pre>`;
};

const renderCallout = (block: ContentBlock & { type: "callout" }): string => {
  const isQuote = block.style === "quote";
  const borderMap: Record<string, string> = {
    warning: `border-l-2 border-${c("warning")}`,
    info: `border-l-2 border-${c("info")}`,
  };
  const borderCls = (block.style && borderMap[block.style]) || "";
  const bg = isQuote ? "bg-d-alt" : "bg-d-card";
  const textCls = isQuote ? "italic text-d-muted" : "text-d-muted";
  const content = block.label
    ? `<span class="font-bold text-${c(block.color || "warning")}">${escapeHtml(block.label)}:</span> <span class="text-d-muted">${escapeHtml(block.text)}</span>`
    : `<span class="${textCls}">${nl2br(block.text)}</span>`;
  return `<div class="${bg} ${borderCls} p-3 rounded text-sm font-body">${content}</div>`;
};

const renderMetric = (block: ContentBlock & { type: "metric" }): string => {
  const lines: string[] = [];
  lines.push(`<div class="text-center">`);
  lines.push(`  <p class="text-4xl font-bold text-${c(block.color || "primary")}">${escapeHtml(block.value)}</p>`);
  lines.push(`  <p class="text-sm text-d-dim mt-1">${escapeHtml(block.label)}</p>`);
  if (block.change) {
    const changeColor = block.change.startsWith("+") ? "success" : "danger";
    lines.push(`  <p class="text-sm font-bold text-${c(changeColor)} mt-1">${escapeHtml(block.change)}</p>`);
  }
  lines.push(`</div>`);
  return lines.join("\n");
};

const renderDivider = (block: ContentBlock & { type: "divider" }): string => {
  const divColor = block.color ? `bg-${c(block.color)}` : "bg-d-alt";
  return `<div class="h-[2px] ${divColor} my-2 rounded-full"></div>`;
};

const renderImage = (block: ContentBlock & { type: "image" }): string => {
  const fit = block.fit === "cover" ? "object-cover" : "object-contain";
  return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || "")}" class="rounded ${fit} max-h-full w-full" />`;
};
