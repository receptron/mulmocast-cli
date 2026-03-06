import test from "node:test";
import assert from "node:assert";
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
  const html = [
    `<img src="image:bg_office" />`,
    `<img src='image:bg_city' />`,
  ].join("\n");
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
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, `<img src="file:///base/dir/images/photo.png" />`);
});

test("resolveRelativeImagePaths: resolves parent-relative path", () => {
  const html = `<img src="../output/photo.png" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, `<img src="file:///base/output/photo.png" />`);
});

test("resolveRelativeImagePaths: leaves http:// unchanged", () => {
  const html = `<img src="https://example.com/photo.png" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves file:// unchanged", () => {
  const html = `<img src="file:///abs/path/photo.png" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves data: unchanged", () => {
  const html = `<img src="data:image/png;base64,abc" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves absolute path unchanged", () => {
  const html = `<img src="/absolute/path/photo.png" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: leaves image: scheme unchanged", () => {
  const html = `<img src="image:bg_office" />`;
  const result = resolveRelativeImagePaths(html, "/base/dir");
  assert.strictEqual(result, html);
});

test("resolveRelativeImagePaths: handles multiple src attributes", () => {
  const html = [
    `<img src="photo1.png" />`,
    `<img src="https://cdn.example.com/photo2.png" />`,
    `<img src="subdir/photo3.png" />`,
  ].join("\n");
  const result = resolveRelativeImagePaths(html, "/base");
  assert(result.includes(`src="file:///base/photo1.png"`));
  assert(result.includes(`src="https://cdn.example.com/photo2.png"`));
  assert(result.includes(`src="file:///base/subdir/photo3.png"`));
});
