import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { viewer, viewerFilePath } from "../../src/actions/viewer.js";
import { createStudioData } from "../../src/utils/context.js";
import type { MulmoStudioContext } from "../../src/types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const sampleImage1 = path.resolve(repoRoot, "scripts/test/img_higgs.png");
const sampleImage2 = path.resolve(repoRoot, "scripts/test/img_detector.png");

const buildContext = (tmpDir: string, beatImageFiles: (string | undefined)[]): MulmoStudioContext => {
  const mulmoScript = {
    $mulmocast: { version: "1.0", credit: "closing" },
    title: "Viewer Test Deck",
    description: "",
    beats: beatImageFiles.map((_, i) => ({
      text: `Caption ${i + 1}`,
      image: { type: "textSlide" as const, slide: { title: `Slide ${i + 1}` } },
    })),
  };
  const studio = createStudioData(mulmoScript, "viewer_test");
  // Inject pre-rendered image paths for each beat so the viewer can pick them up.
  beatImageFiles.forEach((file, i) => {
    if (file && studio.beats[i]) {
      studio.beats[i].imageFile = file;
    }
  });
  return {
    studio,
    fileDirs: {
      baseDirPath: tmpDir,
      outDirPath: tmpDir,
      imageDirPath: tmpDir,
      audioDirPath: tmpDir,
      grouped: false,
    },
    force: false,
    sessionState: {
      inSession: {
        audio: false,
        image: false,
        video: false,
        multiLingual: false,
        caption: false,
        pdf: false,
        markdown: false,
        html: false,
        viewer: false,
      },
      inBeatSession: {
        audio: {},
        image: {},
        movie: {},
        multiLingual: {},
        caption: {},
        html: {},
        imageReference: {},
        soundEffect: {},
        lipSync: {},
      },
    },
    presentationStyle: studio.script,
  } as unknown as MulmoStudioContext;
};

test("viewer writes a self-contained HTML file with embedded base64 images", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-test-"));
  try {
    const context = buildContext(tmpDir, [sampleImage1, sampleImage2]);
    await viewer(context);

    const outPath = viewerFilePath(context);
    assert.ok(fs.existsSync(outPath), "viewer html should exist at the computed path");

    const html = fs.readFileSync(outPath, "utf8");

    // The file is self-contained: no external scripts/styles.
    assert.ok(!html.includes("<script src="), "must not have external <script src=>");
    assert.ok(!html.includes("<link "), "must not have external <link> tag");
    assert.ok(!html.includes("cdn."), "must not reference any cdn.* URL");

    // Title appears (escaped) in the document.
    assert.ok(html.includes("Viewer Test Deck"), "title should appear");

    // Both images are embedded as data URIs (base64).
    const dataUriCount = (html.match(/src="data:image\//g) || []).length;
    assert.equal(dataUriCount, 2, "both images should be embedded as data URIs");

    // Keyboard navigation is wired up.
    assert.ok(html.includes("ArrowRight"), "keyboard handler should bind ArrowRight");
    assert.ok(html.includes("ArrowLeft"), "keyboard handler should bind ArrowLeft");

    // Slide layout prevents scrolling.
    assert.ok(html.includes("overflow: hidden"), "body should have overflow: hidden");

    // The first slide is marked active so it shows on file:// open.
    assert.ok(/<section class="slide active"/.test(html), "first slide must start active");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("viewer skips beats whose imageFile is missing on disk", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-test-"));
  try {
    const missing = path.join(tmpDir, "does-not-exist.png");
    const context = buildContext(tmpDir, [sampleImage1, missing, sampleImage2]);
    await viewer(context);

    const html = fs.readFileSync(viewerFilePath(context), "utf8");
    const dataUriCount = (html.match(/src="data:image\//g) || []).length;
    assert.equal(dataUriCount, 2, "missing image file should be silently skipped");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("viewer produces a usable output even when no beats have images", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-test-"));
  try {
    const context = buildContext(tmpDir, [undefined, undefined]);
    await viewer(context);

    const html = fs.readFileSync(viewerFilePath(context), "utf8");
    // Still a valid HTML doc; just no <section.slide> entries.
    assert.ok(html.includes("<!doctype html>"));
    assert.ok(!html.includes('<section class="slide'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("viewer escapes HTML in title and caption", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-test-"));
  try {
    const mulmoScript = {
      $mulmocast: { version: "1.0", credit: "closing" },
      title: "<script>alert(1)</script>",
      description: "",
      beats: [
        {
          text: 'Caption with <b>bold</b> & special "chars"',
          image: { type: "textSlide" as const, slide: { title: "T" } },
        },
      ],
    };
    const studio = createStudioData(mulmoScript, "viewer_test");
    studio.beats[0].imageFile = sampleImage1;
    const context = {
      studio,
      fileDirs: { baseDirPath: tmpDir, outDirPath: tmpDir, imageDirPath: tmpDir, audioDirPath: tmpDir, grouped: false },
      force: false,
      sessionState: {
        inSession: { audio: false, image: false, video: false, multiLingual: false, caption: false, pdf: false, markdown: false, html: false, viewer: false },
        inBeatSession: { audio: {}, image: {}, movie: {}, multiLingual: {}, caption: {}, html: {}, imageReference: {}, soundEffect: {}, lipSync: {} },
      },
      presentationStyle: studio.script,
    } as unknown as MulmoStudioContext;

    await viewer(context);
    const html = fs.readFileSync(viewerFilePath(context), "utf8");
    assert.ok(!html.includes("<script>alert(1)</script>"), "raw <script> tag from title must not survive");
    assert.ok(html.includes("&lt;script&gt;"), "title special chars must be escaped");
    assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt;"), "caption special chars must be escaped");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
