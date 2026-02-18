import type { BigQuoteSlide } from "../schema.js";
import { escapeHtml, nl2br, c } from "../utils.js";

export const layoutBigQuote = (data: BigQuoteSlide): string => {
  const accent = data.accentColor || "primary";
  const parts: string[] = [];
  parts.push(`<div class="flex flex-col items-center justify-center h-full px-20">`);
  parts.push(`  <div class="h-[3px] w-24 bg-${c(accent)} mb-8"></div>`);
  parts.push(`  <blockquote class="text-[32px] text-d-text font-title italic text-center leading-relaxed">`);
  parts.push(`    &ldquo;${nl2br(data.quote)}&rdquo;`);
  parts.push(`  </blockquote>`);
  parts.push(`  <div class="h-[3px] w-24 bg-${c(accent)} mt-8 mb-6"></div>`);
  if (data.author) {
    parts.push(`  <p class="text-lg text-d-muted font-body">${escapeHtml(data.author)}</p>`);
  }
  if (data.role) {
    parts.push(`  <p class="text-sm text-d-dim font-body mt-1">${escapeHtml(data.role)}</p>`);
  }
  parts.push(`</div>`);
  return parts.join("\n");
};
