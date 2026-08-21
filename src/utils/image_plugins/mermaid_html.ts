import { escapeHtml } from "@mulmocast/deck/lib/utils.js";

/**
 * Mermaid markup. Pure — no Node, no filesystem — because both the Node render path and
 * the browser fragment path draw the same diagram and must draw it the same way.
 *
 * The element id is a parameter rather than generated here: the Node path renders once to
 * a PNG so a random id is fine, while the browser path re-renders and needs the same beat
 * to produce the same markup, or a host diffing fragments sees every diagram change
 * identity on every render.
 *
 * Both values are escaped. Mermaid reads the element's innerHTML and entity-decodes it
 * before parsing (mermaid 11.17.0: `o = u.innerHTML; o = entityDecode(o)`), so it receives
 * the original characters either way — measured across ten diagram shapes including `<br/>`
 * in labels, `#quot;`, raw tags and an init directive, the rendered SVG is byte-identical.
 */
export const mermaidHtml = (code: string, id: string, title?: string): string => {
  const titleHtml = title ? `<h3 class="text-xl font-semibold mb-4">${escapeHtml(title)}</h3>` : "";
  return `
<div class="mermaid-container mb-6">
  ${titleHtml}
  <div class="flex justify-center">
    <div id="${id}" class="mermaid">
      ${escapeHtml(code.trim())}
    </div>
  </div>
</div>`;
};

/** The two values assets/html/mermaid.html interpolates from user data, escaped for its `<h1>` and `.mermaid` text contexts. */
export const escapedMermaidTemplateValues = (title: string, diagramCode: string): { title: string; diagram_code: string } => ({
  title: escapeHtml(title),
  diagram_code: escapeHtml(diagramCode),
});
