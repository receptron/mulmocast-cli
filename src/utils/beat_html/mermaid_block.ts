/**
 * Mermaid markup, shared by the `mermaid` beat and by mermaid fenced blocks inside a
 * `markdown` beat. Kept apart from either so the two cannot drift into rendering the
 * same diagram differently.
 *
 * Mirrors `generateMermaidHtml` in `src/utils/image_plugins/mermaid.ts`, except that the
 * element id is supplied rather than drawn from `node:crypto` — the browser path has to
 * be reproducible, so the same beat rendered twice produces the same markup.
 */
export const mermaidBlockHtml = (code: string, id: string, title?: string): string => {
  const titleHtml = title ? `<h3 class="text-xl font-semibold mb-4">${title}</h3>` : "";
  return `
<div class="mermaid-container mb-6">
  ${titleHtml}
  <div class="flex justify-center">
    <div id="${id}" class="mermaid">
      ${code.trim()}
    </div>
  </div>
</div>`;
};
