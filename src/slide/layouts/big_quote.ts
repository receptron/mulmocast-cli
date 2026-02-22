import type { BigQuoteSlide } from "../schema.js";
import { renderInlineMarkup, accentBar, resolveAccent } from "../utils.js";

export const layoutBigQuote = (data: BigQuoteSlide): string => {
  const accent = resolveAccent(data.accentColor);
  const parts: string[] = [];
  parts.push(`<div class="flex flex-col items-center justify-center h-full px-20">`);
  parts.push(`  ${accentBar(accent, "w-24 mb-8")}`);
  parts.push(`  <blockquote class="text-[32px] text-d-text font-title italic text-center leading-relaxed">`);
  parts.push(`    &ldquo;${renderInlineMarkup(data.quote)}&rdquo;`);
  parts.push(`  </blockquote>`);
  parts.push(`  ${accentBar(accent, "w-24 mt-8 mb-6")}`);
  if (data.author) {
    parts.push(`  <p class="text-lg text-d-muted font-body">${renderInlineMarkup(data.author)}</p>`);
  }
  if (data.role) {
    parts.push(`  <p class="text-sm text-d-dim font-body mt-1">${renderInlineMarkup(data.role)}</p>`);
  }
  parts.push(`</div>`);
  return parts.join("\n");
};
