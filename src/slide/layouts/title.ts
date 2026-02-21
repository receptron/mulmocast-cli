import type { TitleSlide } from "../schema.js";
import { renderInlineMarkup } from "../utils.js";

export const layoutTitle = (data: TitleSlide): string => {
  return [
    `<div class="h-[3px] bg-d-primary"></div>`,
    `<div class="absolute -top-20 -right-8 w-[360px] h-[360px] rounded-full bg-d-primary opacity-10"></div>`,
    `<div class="absolute -bottom-12 -left-16 w-[280px] h-[280px] rounded-full bg-d-accent opacity-10"></div>`,
    `<div class="flex flex-col justify-center h-full px-16 relative z-10">`,
    `  <h1 class="text-[60px] leading-tight font-title font-bold text-d-text">${renderInlineMarkup(data.title)}</h1>`,
    data.subtitle ? `  <p class="text-2xl text-d-muted mt-6 font-body">${renderInlineMarkup(data.subtitle)}</p>` : "",
    data.author ? `  <p class="text-lg text-d-dim mt-10 font-body">${renderInlineMarkup(data.author)}</p>` : "",
    data.note
      ? `  <div class="bg-d-card px-4 py-2 mt-6 inline-block rounded"><p class="text-sm text-d-dim font-body">${renderInlineMarkup(data.note)}</p></div>`
      : "",
    `</div>`,
    `<div class="absolute bottom-0 left-0 right-0 h-[3px] bg-d-accent"></div>`,
  ]
    .filter(Boolean)
    .join("\n");
};
