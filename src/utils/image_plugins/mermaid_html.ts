/**
 * Mermaid markup. Pure — no Node, no filesystem — because both the Node render path and
 * the browser fragment path draw the same diagram and must draw it the same way.
 *
 * The element id is a parameter rather than generated here: the Node path renders once to
 * a PNG so a random id is fine, while the browser path re-renders and needs the same beat
 * to produce the same markup, or a host diffing fragments sees every diagram change
 * identity on every render.
 */
export const mermaidHtml = (code: string, id: string, title?: string): string => {
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
