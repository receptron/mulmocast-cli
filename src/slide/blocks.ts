import type { ContentBlock, BulletItem, SectionBlock, TableBlock, TableCellValue } from "./schema.js";
import { escapeHtml, c, generateSlideId, renderInlineMarkup } from "./utils.js";

// ─── Table cell rendering (shared with layouts/table.ts) ───

export const resolveCellColor = (cellObj: { color?: string }, isRowHeader: boolean): string => {
  if (cellObj.color) return `text-${c(cellObj.color)}`;
  if (isRowHeader) return "text-d-text";
  return "text-d-muted";
};

export const renderBadge = (text: string, color: string): string => {
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-${c(color)}">${renderInlineMarkup(text)}</span>`;
};

export const renderCellValue = (cell: TableCellValue, isRowHeader: boolean): string => {
  const cellObj = typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
  if (cellObj.badge && cellObj.color) {
    return `<td class="px-4 py-3 text-sm font-body border-b border-d-alt">${renderBadge(cellObj.text, cellObj.color)}</td>`;
  }
  const colorCls = resolveCellColor(cellObj, isRowHeader);
  const boldCls = cellObj.bold || isRowHeader ? "font-bold" : "";
  return `<td class="px-4 py-3 text-sm ${colorCls} ${boldCls} font-body border-b border-d-alt">${renderInlineMarkup(cellObj.text)}</td>`;
};

export const renderTableCore = (headers: string[] | undefined, rows: TableCellValue[][], rowHeaders?: boolean, striped?: boolean): string => {
  const parts: string[] = [];
  const isStriped = striped !== false;

  parts.push(`<table class="w-full border-collapse">`);

  if (headers && headers.length > 0) {
    parts.push(`<thead>`);
    parts.push(`<tr>`);
    headers.forEach((h) => {
      parts.push(`  <th class="text-left px-4 py-3 text-sm font-bold text-d-text font-body border-b-2 border-d-alt">${renderInlineMarkup(h)}</th>`);
    });
    parts.push(`</tr>`);
    parts.push(`</thead>`);
  }

  parts.push(`<tbody>`);
  rows.forEach((row, ri) => {
    const bgCls = isStriped && ri % 2 === 1 ? "bg-d-alt/30" : "";
    parts.push(`<tr class="${bgCls}">`);
    (row || []).forEach((cell, ci) => {
      const isRowHeader = ci === 0 && !!rowHeaders;
      parts.push(`  ${renderCellValue(cell, isRowHeader)}`);
    });
    parts.push(`</tr>`);
  });
  parts.push(`</tbody>`);

  parts.push(`</table>`);
  return parts.join("\n");
};

const renderTableBlock = (block: TableBlock): string => {
  const titleHtml = block.title ? `<p class="text-sm font-bold text-d-text font-body mb-2">${renderInlineMarkup(block.title)}</p>` : "";
  return `<div class="overflow-auto">${titleHtml}${renderTableCore(block.headers, block.rows, block.rowHeaders, block.striped)}</div>`;
};

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
    case "imageRef":
      return renderImageRefPlaceholder(block);
    case "chart":
      return renderChart(block);
    case "mermaid":
      return renderMermaid(block);
    case "section":
      return renderSection(block);
    case "table":
      return renderTableBlock(block);
    default:
      return `<p class="text-sm text-d-muted font-body">[unknown block type]</p>`;
  }
};

/** Render an array of content blocks to HTML */
export const renderContentBlocks = (blocks: ContentBlock[]): string => {
  return blocks.map(renderContentBlock).join("\n");
};

/** Render content blocks with fixed aspect-ratio container for image blocks (used in card layouts) */
export const renderCardContentBlocks = (blocks: ContentBlock[]): string => {
  return blocks
    .map((block) => {
      if (block.type === "image") {
        return `<div class="aspect-video shrink-0 overflow-hidden">${renderContentBlock(block)}</div>`;
      }
      return renderContentBlock(block);
    })
    .join("\n");
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
  return `<p class="${size} ${color} ${bold} ${alignCls} font-body leading-relaxed">${renderInlineMarkup(block.value)}</p>`;
};

/** Extract text from a bullet item (string or object) */
const bulletItemText = (item: BulletItem): string => {
  return typeof item === "string" ? item : item.text;
};

/** Render sub-bullets for a nested bullet item */
const renderSubBullets = (item: BulletItem): string => {
  if (typeof item === "string" || !item.items || item.items.length === 0) return "";
  const subs = item.items
    .map((sub) => {
      return `    <li class="flex gap-2 ml-6 text-[14px]"><span class="text-d-dim shrink-0">\u25E6</span><span>${renderInlineMarkup(bulletItemText(sub))}</span></li>`;
    })
    .join("\n");
  return `\n${subs}`;
};

const renderBullets = (block: ContentBlock & { type: "bullets" }): string => {
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items
    .map((item, i) => {
      const marker = block.ordered ? `${i + 1}.` : escapeHtml(block.icon || "\u2022");
      const text = bulletItemText(item);
      const subHtml = renderSubBullets(item);
      return `  <li class="flex flex-col gap-1"><div class="flex gap-2"><span class="text-d-dim shrink-0">${marker}</span><span>${renderInlineMarkup(text)}</span></div>${subHtml}</li>`;
    })
    .join("\n");
  return `<${tag} class="space-y-2 text-[15px] text-d-muted font-body">\n${items}\n</${tag}>`;
};

const renderCode = (block: ContentBlock & { type: "code" }): string => {
  return `<pre class="bg-[#0D1117] p-4 rounded text-sm font-mono text-d-dim leading-relaxed whitespace-pre-wrap">${escapeHtml(block.code)}</pre>`;
};

const renderCallout = (block: ContentBlock & { type: "callout" }): string => {
  const isQuote = block.style === "quote";
  const resolveBorderCls = (style: "quote" | "info" | "warning" | undefined): string => {
    if (style === "warning") return `border-l-2 border-${c("warning")}`;
    if (style === "info") return `border-l-2 border-${c("info")}`;
    return "";
  };
  const borderCls = resolveBorderCls(block.style);
  const bg = isQuote ? "bg-d-alt" : "bg-d-card";
  const textCls = isQuote ? "italic text-d-muted" : "text-d-muted";
  const content = block.label
    ? `<span class="font-bold text-${c(block.color || "warning")}">${renderInlineMarkup(block.label)}:</span> <span class="text-d-muted">${renderInlineMarkup(block.text)}</span>`
    : `<span class="${textCls}">${renderInlineMarkup(block.text)}</span>`;
  return `<div class="${bg} ${borderCls} p-3 rounded text-sm font-body">${content}</div>`;
};

const renderMetric = (block: ContentBlock & { type: "metric" }): string => {
  const lines: string[] = [];
  lines.push(`<div class="text-center">`);
  lines.push(`  <p class="text-4xl font-bold text-${c(block.color || "primary")}">${renderInlineMarkup(block.value)}</p>`);
  lines.push(`  <p class="text-sm text-d-dim mt-1">${renderInlineMarkup(block.label)}</p>`);
  if (block.change) {
    const changeColor = /\+/.test(block.change) ? "success" : "danger";
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
  return `<div class="min-h-0 flex-1 overflow-hidden flex items-center"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || "")}" class="rounded ${fit} w-full h-full" /></div>`;
};

/** Placeholder for unresolved imageRef blocks — should be resolved before rendering */
const renderImageRefPlaceholder = (block: ContentBlock & { type: "imageRef" }): string => {
  return `<div class="min-h-0 flex-1 overflow-hidden flex items-center justify-center bg-d-alt rounded"><p class="text-sm text-d-dim font-body">[imageRef: ${escapeHtml(block.ref)}]</p></div>`;
};

const renderChart = (block: ContentBlock & { type: "chart" }): string => {
  const chartId = generateSlideId("chart");
  const chartData = JSON.stringify(block.chartData);
  const titleHtml = block.title ? `<p class="text-sm font-bold text-d-text font-body mb-2">${renderInlineMarkup(block.title)}</p>` : "";
  return `<div class="flex-1 min-h-0 flex flex-col">
  ${titleHtml}
  <div class="flex-1 min-h-0 relative">
    <canvas id="${chartId}" data-chart-ready="false"></canvas>
  </div>
  <script>(function(){
    const ctx=document.getElementById('${chartId}');
    const d=${chartData};
    if(!d.options)d.options={};
    d.options.animation=false;
    d.options.responsive=true;
    d.options.maintainAspectRatio=false;
    new Chart(ctx,d);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ctx.dataset.chartReady="true"}));
  })()</script>
</div>`;
};

const renderMermaid = (block: ContentBlock & { type: "mermaid" }): string => {
  const mermaidId = generateSlideId("mermaid");
  const titleHtml = block.title ? `<p class="text-sm font-bold text-d-text font-body mb-2">${renderInlineMarkup(block.title)}</p>` : "";
  return `<div class="flex-1 min-h-0 flex flex-col">
  ${titleHtml}
  <div class="flex-1 min-h-0 flex justify-center items-center">
    <div id="${mermaidId}" class="mermaid">${escapeHtml(block.code)}</div>
  </div>
</div>`;
};

/** Render the text + content blocks inside a section (shared by sidebar/default variants) */
const renderSectionContent = (block: SectionBlock): string => {
  const parts: string[] = [];
  if (block.text) {
    parts.push(`<p class="text-[15px] text-d-muted font-body">${renderInlineMarkup(block.text)}</p>`);
  }
  if (block.content) {
    parts.push(block.content.map(renderContentBlock).join("\n"));
  }
  return parts.join("\n");
};

const renderSectionSidebar = (block: SectionBlock): string => {
  const color = block.color || "primary";
  const chars = block.label
    .split("")
    .map((ch) => escapeHtml(ch))
    .join("<br>");
  const sidebar = `<div class="w-[48px] shrink-0 rounded-l bg-${c(color)} flex items-center justify-center"><span class="text-sm font-bold text-white font-body leading-snug text-center">${chars}</span></div>`;
  return `<div class="flex rounded overflow-hidden bg-d-card">
  ${sidebar}
  <div class="flex-1 space-y-2 p-3">${renderSectionContent(block)}</div>
</div>`;
};

const renderSectionDefault = (block: SectionBlock): string => {
  const color = block.color || "primary";
  const badge = `<span class="min-w-[80px] px-3 py-1 rounded text-sm font-bold text-white bg-${c(color)} shrink-0">${renderInlineMarkup(block.label)}</span>`;
  return `<div class="flex gap-4 items-start">
  ${badge}
  <div class="flex-1 space-y-2">${renderSectionContent(block)}</div>
</div>`;
};

const renderSection = (block: SectionBlock): string => {
  return block.sidebar ? renderSectionSidebar(block) : renderSectionDefault(block);
};
