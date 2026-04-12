# Plan: Add default background-color to textSlide styles

## Problem

The default CSS for textSlide sets `color: #333` (dark grey) on the body but does **not** set a `background-color`. Puppeteer defaults to a white background, so slides render correctly within the MulmoCast CLI pipeline. However, when an external app uses this module as a library and renders the generated HTML in a different context (e.g., a dark-themed WebView, an embedded browser with a black default background), the dark grey text becomes nearly invisible against the dark inherited background.

## Root Cause

In `src/methods/mulmo_presentation_style.ts`, the `defaultTextSlideStyles` array defines:

```css
body { margin: 60px; margin-top: 40px; color:#333; font-size: 30px; font-family: Arial, sans-serif; box-sizing: border-box; height: 100vh }
```

No `background-color` is specified. The rendering relies on the implicit white background of Puppeteer's Chromium instance, which is not guaranteed in other environments.

## Fix

Add `background-color: #fff` to the default `body` rule so that textSlide always has an explicit white background regardless of the rendering environment.

## Affected Files

- `src/methods/mulmo_presentation_style.ts` (line 43) — add `background-color: #fff` to the body style string

## Notes

- Users can still override this via `textSlideParams.cssStyles` at the presentation or beat level, since those styles are appended after the defaults.
- The `backgroundImage` feature (via `bg_image_util.ts`) also sets its own `body` styles, which will naturally override this default when a background image is specified.
