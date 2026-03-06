import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { resolveImageRefs, resolveRelativeImagePaths } from "../../src/utils/image_plugins/html_tailwind.js";

// --- resolveImageRefs ---

test("resolveImageRefs: resolves image: scheme with double quotes", () => {
  const html = `<img src="image:bg_office" style="width:100%">`;
  const imageRefs = { bg_office: "/abs/path/bg_office.png" };
  const result = resolveImageRefs(html, imageRefs);
  assert.strictEqual(result, `<img src="file:///abs/path/bg_office.png" style="width:100%">`);
});

test("resolveImageRefs: resolves image: scheme with single quotes", () => {
  const html = `<img src='image:bg_city' />`;
  const imageRefs = { bg_city: "/output/images/bg_city.png" };
  const result = resolveImageRefs(html, imageRefs);
  assert.strictEqual(result, `<img src='file:///output/images/bg_city.png' />`);
});

test("resolveImageRefs: resolves multiple image: refs in same html", () => {
  const html = [`<img src="image:bg_office" />`, `<img src='image:bg_city' />`].join("\n");
  const imageRefs = {
    bg_office: "/path/bg_office.png",
    bg_city: "/path/bg_city.png",
  };
  const result = resolveImageRefs(html, imageRefs);
  assert(result.includes(`src="file:///path/bg_office.png"`));
  assert(result.includes(`src='file:///path/bg_city.png'`));
});

test("resolveImageRefs: leaves unknown image: ref unchanged", () => {
  const html = `<img src="image:nonexistent" />`;
  const imageRefs = { bg_office: "/path/bg_office.png" };
  const result = resolveImageRefs(html, imageRefs);
  assert.strictEqual(result, `<img src="image:nonexistent" />`);
});

test("resolveImageRefs: leaves non-image: src unchanged", () => {
  const html = `<img src="https://example.com/photo.png" />`;
  const imageRefs = { bg_office: "/path/bg_office.png" };
  const result = resolveImageRefs(html, imageRefs);
  assert.strictEqual(result, `<img src="https://example.com/photo.png" />`);
});

test("resolveImageRefs: handles empty imageRefs", () => {
  const html = `<img src="image:bg_office" />`;
  const result = resolveImageRefs(html, {});
  assert.strictEqual(result, `<img src="image:bg_office" />`);
});

test("resolveImageRefs: handles html with no src attributes", () => {
  const html = `<div class="container">Hello</div>`;
  const imageRefs = { bg_office: "/path/bg_office.png" };
  const result = resolveImageRefs(html, imageRefs);
  assert.strictEqual(result, html);
});

// --- resolveRelativeImagePaths ---

test("resolveRelativeImagePaths: resolves relative path", () => {
  const html = `<img src="images/photo.png" />`;
  const baseDirPath = path.resolve("/base/dir");
  const result = resolveRelativeImagePaths(html, baseDirPath);
  const expected = `<img src="file://${path.resolve(baseDirPath, "images/photo.png")}" />`;
  assert.strictEqual(result, expected);
});

test("resolveRelativeImagePaths: resolves parent-relative path", () => {
  const html = `<img src="../output/photo.png" />`;
  const baseDirPath = path.resolve("/base/dir");
  const result = resolveRelativeImagePaths(html, baseDirPath);
  const expected = `<img src="file://${path.resolve(baseDirPath, "../output/photo.png")}" />`;
  assert.strictEqual(result, expected);
});

test("resolveRelativeImagePaths: leaves http:// unchanged", () => {
  const html = `<img src="https://example.com/photo.png" />`;
  const result = resolveRelativeImagePaths(html, path.resolve("/base/dir"));
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves file:// unchanged", () => {
  const html = `<img src="file:///abs/path/photo.png" />`;
  const result = resolveRelativeImagePaths(html, path.resolve("/base/dir"));
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves data: unchanged", () => {
  const html = `<img src="data:image/png;base64,abc" />`;
  const result = resolveRelativeImagePaths(html, path.resolve("/base/dir"));
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves slash-prefixed path unchanged", () => {
  const html = `<img src="/absolute/path/photo.png" />`;
  const result = resolveRelativeImagePaths(html, path.resolve("/base/dir"));
  // Slash-prefixed paths are excluded by the regex (starts with /)
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves image: scheme unchanged", () => {
  const html = `<img src="image:bg_office" />`;
  const result = resolveRelativeImagePaths(html, path.resolve("/base/dir"));
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: handles multiple src attributes", () => {
  const html = [`<img src="photo1.png" />`, `<img src="https://cdn.example.com/photo2.png" />`, `<img src="subdir/photo3.png" />`].join("\n");
  const baseDirPath = path.resolve("/base");
  const result = resolveRelativeImagePaths(html, baseDirPath);
  assert(result.includes(`src="file://${path.resolve(baseDirPath, "photo1.png")}"`));
  assert(result.includes(`src="https://cdn.example.com/photo2.png"`));
  assert(result.includes(`src="file://${path.resolve(baseDirPath, "subdir/photo3.png")}"`));
});
