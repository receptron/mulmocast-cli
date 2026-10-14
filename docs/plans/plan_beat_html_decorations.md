# beatToHtml: backgrounds, slide branding and reference (#1640)

The PNG render decorates beats with things `beatToHtml` did not carry, so a browser host
(receptron/mulmoclaude#3477) fell back to the PNG for them:

- `backgroundImage` (beat, else `imageParams`; beat `null` disables) on textSlide / markdown / chart / mermaid
- `branding` (beat, else `slideParams`; beat `null` disables) and `reference` on slide

## Approach

- Split the pure half of `bg_image_util.ts` into `bg_image_css.ts` (`resolveBackgroundImage`, layout, CSS)
  so the Node render and the browser path write the same rules; `bg_image_util.ts` keeps the fetch / file
  reads. Verified byte-identical against the old module over generated inputs.
- `pickBranding` in `slide_branding.ts`, used by the Node render and the browser path.
- `BeatHtmlOptions` gains `backgroundImage`, `branding`, `resolveMediaUrl` (all optional; absent → output
  unchanged). `BeatHtmlFragment` gains `documentCss` for textSlide / markdown backgrounds: those rules target
  `html` / `body` as the PNG does, and a text beat's markup has no root to scope them to.
- chart / mermaid backgrounds go to deck as the figure slide's branding background layer; slide branding and
  `reference` go to `generateSlideFragment` as on the Node side.
- Host-resolved urls are percent-encoded where they could leave `url('…')` or an attribute (deck writes them
  unescaped).

## Not in scope

- A named `style` on chart / mermaid: markdown-style CSS for the PNG templates, not applicable to deck figure slides.
- html_tailwind `elements` / `animation`: #1641.
