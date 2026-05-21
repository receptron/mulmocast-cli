import fs from "fs";
import path from "path";
import { MulmoStudioContext } from "../types/index.js";
import { localizedText } from "../utils/utils.js";
import { writingMessage } from "../utils/file.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { escapeHtml } from "../slide/utils.js";

const imageMimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const imageToDataUri = (filePath: string): string | null => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = imageMimeTypes[ext] ?? "image/png";
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${base64}`;
};

type Slide = { dataUri: string; caption: string };

const collectSlides = (context: MulmoStudioContext): Slide[] => {
  const { studio, multiLingual, lang = "en" } = context;
  const slides: Slide[] = [];
  studio.script.beats.forEach((beat, index) => {
    const studioBeat = studio.beats[index];
    const source = studioBeat?.imageFile ?? studioBeat?.htmlImageFile;
    if (!source) return;
    const dataUri = imageToDataUri(source);
    if (!dataUri) return;
    slides.push({
      dataUri,
      caption: localizedText(beat, multiLingual?.[index], lang),
    });
  });
  return slides;
};

const viewerStyles = `
  html, body { margin: 0; padding: 0; height: 100vh; overflow: hidden; background: #000; }
  #deck { position: relative; width: 100vw; height: 100vh; }
  section.slide {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    padding: 24px;
    box-sizing: border-box;
  }
  section.slide.active { visibility: visible; }
  section.slide img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    user-select: none;
  }
  section.slide p.caption {
    color: #eee;
    margin-top: 16px;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 80ch;
    max-height: 15vh;
    overflow: hidden;
  }
  #counter {
    position: fixed;
    right: 16px;
    bottom: 12px;
    color: #aaa;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    user-select: none;
    pointer-events: none;
  }
`;

const viewerScript = `
  (function () {
    const slides = document.querySelectorAll("section.slide");
    const counter = document.getElementById("counter");
    if (slides.length === 0) return;
    let current = 0;
    const show = (i) => {
      slides[current].classList.remove("active");
      current = Math.max(0, Math.min(slides.length - 1, i));
      slides[current].classList.add("active");
      counter.textContent = (current + 1) + " / " + slides.length;
    };
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        show(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        show(current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        show(0);
      } else if (e.key === "End") {
        e.preventDefault();
        show(slides.length - 1);
      } else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen && document.exitFullscreen();
        }
      } else if (e.key === "Escape") {
        document.exitFullscreen && document.exitFullscreen();
      }
    });
    document.addEventListener("click", () => show(current + 1));
    show(0);
  })();
`;

const generateViewerHtml = (context: MulmoStudioContext): string => {
  const title = context.studio.script.title || "MulmoCast Viewer";
  const slides = collectSlides(context);
  const slidesHtml = slides
    .map((s, i) => {
      const captionHtml = s.caption.trim() ? `<p class="caption">${escapeHtml(s.caption)}</p>` : "";
      const cls = i === 0 ? "slide active" : "slide";
      return `      <section class="${cls}"><img src="${s.dataUri}" alt="Slide ${i + 1}" />${captionHtml}</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>${viewerStyles}</style>
  </head>
  <body>
    <div id="deck">
${slidesHtml}
    </div>
    <div id="counter"></div>
    <script>${viewerScript}</script>
  </body>
</html>
`;
};

export const viewerFilePath = (context: MulmoStudioContext): string => {
  const { studio, fileDirs, lang = "en" } = context;
  const langSuffix = studio.script.lang !== lang ? `_${lang}` : "";
  const filename = `${studio.filename}${langSuffix}_viewer.html`;
  return path.join(fileDirs.outDirPath, filename);
};

const generateViewer = (context: MulmoStudioContext): void => {
  const outputPath = viewerFilePath(context);
  const htmlContent = generateViewerHtml(context);
  fs.writeFileSync(outputPath, htmlContent, "utf8");
  writingMessage(outputPath);
};

export const viewer = async (context: MulmoStudioContext): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "viewer", true);
    generateViewer(context);
    MulmoStudioContextMethods.setSessionState(context, "viewer", false, true);
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "viewer", false, false);
    throw error;
  }
};
