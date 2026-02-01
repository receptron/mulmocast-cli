import { type MulmoMarkdownLayout, type MulmoRow2, type MulmoGrid2x2 } from "../../types/type.js";
import { marked } from "marked";

// Convert string or string array to markdown string
const toMarkdownString = (content: string | string[]): string => {
  if (Array.isArray(content)) {
    return content.join("\n");
  }
  return content;
};

// Parse markdown content to HTML
const parseMarkdown = async (content: string | string[]): Promise<string> => {
  const text = toMarkdownString(content);
  return await marked.parse(text);
};

// Generate header HTML
const generateHeaderHtml = async (data: string | string[]): Promise<string> => {
  const headerHtml = await parseMarkdown(data);
  return `
    <div class="shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50">
      <div class="prose prose-lg max-w-none">${headerHtml}</div>
    </div>
  `;
};

// Generate sidebar HTML
const generateSidebarHtml = async (data: string | string[]): Promise<string> => {
  const sidebarHtml = await parseMarkdown(data);
  return `
    <div class="shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto">
      <div class="prose prose-sm max-w-none">${sidebarHtml}</div>
    </div>
  `;
};

// Generate row-2 layout HTML (two columns)
const generateRow2Html = async (data: MulmoRow2): Promise<string> => {
  const [left, right] = data;
  const leftHtml = await parseMarkdown(left);
  const rightHtml = await parseMarkdown(right);
  return `
    <div class="h-full flex gap-6">
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${leftHtml}</div>
      </div>
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${rightHtml}</div>
      </div>
    </div>
  `;
};

// Generate 2x2 grid layout HTML
const generate2x2Html = async (data: MulmoGrid2x2): Promise<string> => {
  const [tl, tr, bl, br] = data;
  const [tlHtml, trHtml, blHtml, brHtml] = await Promise.all([parseMarkdown(tl), parseMarkdown(tr), parseMarkdown(bl), parseMarkdown(br)]);
  return `
    <div class="h-full grid grid-cols-2 grid-rows-2 gap-4">
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${tlHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${trHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${blHtml}</div>
      </div>
      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${brHtml}</div>
      </div>
    </div>
  `;
};

// Generate content HTML (single column)
const generateContentHtml = async (data: string | string[]): Promise<string> => {
  const contentHtml = await parseMarkdown(data);
  return `<div class="prose max-w-none">${contentHtml}</div>`;
};

// Generate Tailwind HTML for layout
export const generateLayoutHtml = async (md: MulmoMarkdownLayout): Promise<string> => {
  const parts: string[] = ['<div class="w-full h-full flex flex-col overflow-hidden">'];

  if (md.header) {
    parts.push(await generateHeaderHtml(md.header));
  }

  parts.push('<div class="flex-1 flex min-h-0 overflow-hidden">');

  if (md["sidebar-left"]) {
    parts.push(await generateSidebarHtml(md["sidebar-left"]));
  }

  parts.push('<div class="flex-1 p-6 overflow-auto">');

  if ("row-2" in md) {
    parts.push(await generateRow2Html(md["row-2"]));
  } else if ("2x2" in md) {
    parts.push(await generate2x2Html(md["2x2"]));
  } else if ("content" in md) {
    parts.push(await generateContentHtml(md.content));
  }

  parts.push("</div>", "</div>", "</div>");

  return parts.join("");
};

// Convert layout to plain markdown string
export const layoutToMarkdown = (md: MulmoMarkdownLayout): string => {
  const parts: string[] = [];

  if (md.header) {
    parts.push(toMarkdownString(md.header));
  }
  if (md["sidebar-left"]) {
    parts.push(toMarkdownString(md["sidebar-left"]));
  }
  if ("row-2" in md) {
    parts.push(...md["row-2"].map(toMarkdownString));
  } else if ("2x2" in md) {
    parts.push(...md["2x2"].map(toMarkdownString));
  } else if ("content" in md) {
    parts.push(toMarkdownString(md.content));
  }

  return parts.join("\n\n");
};

export { toMarkdownString };
