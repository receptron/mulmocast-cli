# beatToHtml: html_tailwind scripts and animation for script-capable hosts (#1641)

The PNG render runs an html_tailwind beat's author `script`, the swipe driver from `elements`, and for
`animation` the runtime in `assets/html/js/` up to the final frame. `beatToHtml` emitted the markup at rest
only, so a browser host fell back to the PNG (receptron/mulmoclaude#3477).

## Approach

- `yarn template` also writes `src/data/animationRuntime.ts` from `assets/html/js/*.js`, so the browser bundle
  can inline the runtime; a test fails when it drifts from the assets.
- Pure helpers move out of `image_plugins/html_tailwind.ts` into `html_tailwind_script.ts`
  (`buildUserScript`, `resolveHtmlAndScript`, fps, `FINAL_FRAME_TOTAL`) and the animation guards out of
  `methods/mulmo_beat.ts` into `utils/animation_config.ts` (the browser bundle must not reach zod). Verified
  identical to the old code over generated inputs.
- `BeatHtmlFragment.documentScript`: `<script>` elements for the end of the beat's own document. Without
  `animation`, the author script / swipe driver as `tailwind.html` runs them; with it, runtime + frame state +
  registration + auto-render as `tailwind_animated.html`, then `renderFinal()` on `load` (after a deferred
  module author script), as `renderHTMLToFinalFrame` does. `html` stays script-free.

## Not in scope

- Resolving `image:` / `movie:` refs and relative paths inside the markup (the PNG path rewrites them to `file://`).
