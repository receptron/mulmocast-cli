import type { BackgroundImage } from "../../types/index.js";
import { escapeCssString } from "../html_escape.js";

/**
 * Background-image rules, without fetching or reading anything. Pure — no Node, no filesystem —
 * because the PNG render and the browser fragment path paint the same background and must
 * resolve and write it the same way.
 */

/**
 * Resolve background image from beat level and global level settings.
 * Beat level takes precedence over global level.
 * null explicitly disables background image.
 */
export const resolveBackgroundImage = (
  beatBackgroundImage: BackgroundImage | undefined,
  globalBackgroundImage: BackgroundImage | undefined,
): BackgroundImage | undefined => {
  // null means explicitly disabled
  if (beatBackgroundImage === null) {
    return undefined;
  }
  // Beat level takes precedence
  if (beatBackgroundImage !== undefined) {
    return beatBackgroundImage;
  }
  // Fall back to global
  if (globalBackgroundImage === null) {
    return undefined;
  }
  return globalBackgroundImage;
};

/** How a resolved background is laid out: a plain url string is always `cover` at full opacity. */
export const backgroundImageLayout = (backgroundImage: NonNullable<BackgroundImage>): { size: string; opacity: number } => {
  if (typeof backgroundImage === "string") return { size: "cover", opacity: 1 };
  return { size: backgroundImage.size ?? "cover", opacity: backgroundImage.opacity ?? 1 };
};

// Convert size option to CSS background-size value
const sizeToCSS = (size: string): string => {
  return size === "fill" ? "100% 100%" : size;
};

/** Rules painting `imageUrl` behind the whole document (`html` / `body`), as the PNG render does. */
export const backgroundImageCss = (imageUrl: string, size: string, opacity: number): string => {
  const cssSize = sizeToCSS(size);
  // Use pseudo-element for opacity to not affect content
  if (opacity < 1) {
    return `
      html, body {
        height: 100%;
        margin: 0;
      }
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('${escapeCssString(imageUrl)}');
        background-size: ${cssSize};
        background-position: center;
        background-repeat: no-repeat;
        opacity: ${opacity};
        z-index: -1;
      }
    `;
  }

  return `
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      background-image: url('${escapeCssString(imageUrl)}');
      background-size: ${cssSize};
      background-position: center;
      background-repeat: no-repeat;
    }
  `;
};
