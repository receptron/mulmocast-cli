import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { collectContentArrays, resolveSlideImageRefs } from "../../src/utils/image_plugins/slide.js";
import type { SlideLayout, ContentBlock } from "../../src/slide/schema.js";

// ═══════════════════════════════════════════════════════════
// collectContentArrays
// ═══════════════════════════════════════════════════════════

test("collectContentArrays: columns layout collects card content arrays", () => {
  const slide: SlideLayout = {
    layout: "columns",
    title: "Test",
    columns: [
      { title: "A", content: [{ type: "text", value: "hello" }] },
      { title: "B", content: [{ type: "image", src: "img.png" }] },
      { title: "C" }, // no content
    ],
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 2);
});

test("collectContentArrays: comparison layout collects left and right content", () => {
  const slide: SlideLayout = {
    layout: "comparison",
    title: "Test",
    left: { title: "L", content: [{ type: "text", value: "left" }] },
    right: { title: "R", content: [{ type: "text", value: "right" }] },
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 2);
});

test("collectContentArrays: grid layout collects item content arrays", () => {
  const slide: SlideLayout = {
    layout: "grid",
    title: "Test",
    items: [
      { title: "A", content: [{ type: "text", value: "a" }] },
      { title: "B" }, // no content
    ],
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 1);
});

test("collectContentArrays: split layout collects left and right content", () => {
  const slide: SlideLayout = {
    layout: "split",
    left: { content: [{ type: "text", value: "left" }] },
    right: { content: [{ type: "text", value: "right" }] },
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 2);
});

test("collectContentArrays: split layout handles missing panels", () => {
  const slide: SlideLayout = {
    layout: "split",
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: matrix layout collects cell content arrays", () => {
  const slide: SlideLayout = {
    layout: "matrix",
    title: "Test",
    cells: [
      { label: "A", content: [{ type: "text", value: "a" }] },
      { label: "B", content: [{ type: "text", value: "b" }] },
      { label: "C" }, // no content
    ],
  };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 2);
});

test("collectContentArrays: title layout returns empty", () => {
  const slide: SlideLayout = { layout: "title", title: "Hello" };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: bigQuote layout returns empty", () => {
  const slide: SlideLayout = { layout: "bigQuote", quote: "Be bold" };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: stats layout returns empty", () => {
  const slide: SlideLayout = { layout: "stats", title: "Stats", stats: [] };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: timeline layout returns empty", () => {
  const slide: SlideLayout = { layout: "timeline", title: "Timeline", items: [] };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: table layout returns empty", () => {
  const slide: SlideLayout = { layout: "table", title: "Table", headers: [], rows: [] };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

test("collectContentArrays: funnel layout returns empty", () => {
  const slide: SlideLayout = { layout: "funnel", title: "Funnel", stages: [] };
  const arrays = collectContentArrays(slide);
  assert.strictEqual(arrays.length, 0);
});

// ═══════════════════════════════════════════════════════════
// resolveSlideImageRefs
// ═══════════════════════════════════════════════════════════

// Helper: create a minimal PNG file for testing pathToDataUrl
const createTestPng = (): string => {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, "test_image_ref_unit.png");
  // Minimal 1x1 PNG (67 bytes)
  const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(filePath, pngBuffer);
  return filePath;
};

test("resolveSlideImageRefs: resolves imageRef to image block with data URL", () => {
  const testPng = createTestPng();
  const slide: SlideLayout = {
    layout: "split",
    left: {
      content: [{ type: "imageRef", ref: "logo" }],
    },
  };
  const imageRefs = { logo: testPng };
  const resolved = resolveSlideImageRefs(slide, imageRefs);
  const content = (resolved as { left: { content: ContentBlock[] } }).left.content;
  const imageBlock = content[0] as ContentBlock & { type: "image" };
  assert.strictEqual(imageBlock.type, "image");
  assert.ok(imageBlock.src.startsWith("data:image/png;base64,"));
});

test("resolveSlideImageRefs: image block src is not modified", () => {
  const slide: SlideLayout = {
    layout: "split",
    left: {
      content: [{ type: "image", src: "https://example.com/photo.jpg" }],
    },
  };
  const resolved = resolveSlideImageRefs(slide, {});
  const content = (resolved as { left: { content: ContentBlock[] } }).left.content;
  const imageBlock = content[0] as ContentBlock & { type: "image" };
  assert.strictEqual(imageBlock.src, "https://example.com/photo.jpg");
});

test("resolveSlideImageRefs: throws on unknown ref key", () => {
  const slide: SlideLayout = {
    layout: "split",
    left: {
      content: [{ type: "imageRef", ref: "unknown_key" }],
    },
  };
  assert.throws(
    () => resolveSlideImageRefs(slide, {}),
    (err: Error) => err.message.includes("unknown_key"),
  );
});

test("resolveSlideImageRefs: does not mutate original slide", () => {
  const testPng = createTestPng();
  const slide: SlideLayout = {
    layout: "split",
    left: {
      content: [{ type: "imageRef", ref: "logo" }],
    },
  };
  const imageRefs = { logo: testPng };
  resolveSlideImageRefs(slide, imageRefs);
  const content = (slide as { left: { content: ContentBlock[] } }).left.content;
  const refBlock = content[0] as ContentBlock & { type: "imageRef" };
  assert.strictEqual(refBlock.type, "imageRef");
  assert.strictEqual(refBlock.ref, "logo");
});

test("resolveSlideImageRefs: handles mixed imageRef and image blocks", () => {
  const testPng = createTestPng();
  const slide: SlideLayout = {
    layout: "columns",
    title: "Mixed",
    columns: [
      {
        title: "A",
        content: [
          { type: "imageRef", ref: "logo" },
          { type: "text", value: "text block" },
          { type: "image", src: "https://example.com/img.png" },
        ],
      },
    ],
  };
  const resolved = resolveSlideImageRefs(slide, { logo: testPng });
  const content = (resolved as { columns: { content: ContentBlock[] }[] }).columns[0].content;
  const img1 = content[0] as ContentBlock & { type: "image" };
  const img2 = content[2] as ContentBlock & { type: "image" };
  assert.strictEqual(img1.type, "image");
  assert.ok(img1.src.startsWith("data:image/png;base64,"));
  assert.strictEqual(img2.src, "https://example.com/img.png");
});

test("resolveSlideImageRefs: preserves alt and fit from imageRef block", () => {
  const testPng = createTestPng();
  const slide: SlideLayout = {
    layout: "split",
    left: {
      content: [{ type: "imageRef", ref: "logo", alt: "Company logo", fit: "cover" }],
    },
  };
  const resolved = resolveSlideImageRefs(slide, { logo: testPng });
  const content = (resolved as { left: { content: ContentBlock[] } }).left.content;
  const imageBlock = content[0] as ContentBlock & { type: "image" };
  assert.strictEqual(imageBlock.type, "image");
  assert.strictEqual(imageBlock.alt, "Company logo");
  assert.strictEqual(imageBlock.fit, "cover");
});

test("resolveSlideImageRefs: layout without content blocks returns unchanged clone", () => {
  const slide: SlideLayout = { layout: "title", title: "Hello" };
  const resolved = resolveSlideImageRefs(slide, { logo: "/some/path.png" });
  assert.deepStrictEqual(resolved, slide);
});
