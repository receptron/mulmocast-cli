import test from "node:test";
import assert from "node:assert";
import { imageToHtml, movieToHtml } from "../../src/utils/beat_html/media.js";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { mulmoBeatSchema, mulmoImageMediaSchema, mulmoMovieMediaSchema } from "../../src/types/schema.js";

/**
 * `z.url()` accepts a quote — `https://e.com/a.mp4" onerror="pwn()` parses clean — so the src
 * is escaped rather than trusted. Verified in a browser that this costs nothing for ordinary
 * urls: `src="…?x=1&amp;y=2"` issues a request for `?x=1&y=2`, byte for byte the old URL.
 */

const image = (source: Record<string, unknown>) => mulmoImageMediaSchema.parse({ type: "image", source });
const movie = (source: Record<string, unknown>) => mulmoMovieMediaSchema.parse({ type: "movie", source });
const URL_SRC = { kind: "url", url: "https://example.com/a.png" };

test("a url source becomes the element's src", () => {
  assert.match(imageToHtml(image(URL_SRC), "a cat")!.html, /<img src="https:\/\/example\.com\/a\.png" alt="a cat"/);
  assert.match(movieToHtml(movie({ kind: "url", url: "https://example.com/a.mp4" }))!.html, /<source src="https:\/\/example\.com\/a\.mp4" type="video\/mp4">/);
});

test("a path is emitted for the host to resolve, a base64 source renders nothing", () => {
  assert.match(imageToHtml(image({ kind: "path", path: "images/a.png" }), "")!.html, /src="images\/a\.png"/);
  assert.strictEqual(imageToHtml(image({ kind: "base64", data: "AAAA" }), ""), undefined, "no media type, so no data URI");
  assert.strictEqual(movieToHtml(movie({ kind: "base64", data: "AAAA" })), undefined);
});

test("neither needs a runtime from the host", () => {
  assert.strictEqual(imageToHtml(image(URL_SRC), "").requires, undefined);
  assert.strictEqual(movieToHtml(movie({ kind: "url", url: "https://e.com/a.mp4" }))!.requires, undefined);
});

test("a url that closes the attribute is neutralized", () => {
  const hostile = { kind: "url", url: 'https://e.com/a.png" onerror="pwn()' };
  const html = imageToHtml(image(hostile), "")!.html;
  assert.ok(!/<img[^>]*"\s+onerror=/.test(html), "no event handler may be introduced");
  assert.match(html, /src="https:\/\/e\.com\/a\.png&quot; onerror=&quot;pwn\(\)"/);
});

test("a hostile movie url is neutralized in all three source tags", () => {
  const html = movieToHtml(movie({ kind: "url", url: 'https://e.com/a.mp4" onerror="pwn()' }))!.html;
  assert.strictEqual(html.split("&quot; onerror=&quot;pwn()").length - 1, 3, "every <source> must be escaped, not just the first");
  assert.ok(!/<source[^>]*"\s+onerror=/.test(html), "no event handler may be introduced");
});

test("a hostile alt cannot escape its attribute", () => {
  const html = imageToHtml(image(URL_SRC), '" onload="pwn()')!.html;
  assert.match(html, /alt="&quot; onload=&quot;pwn\(\)"/);
  assert.ok(!/<img[^>]*\salt="[^"]*"\s+onload=/.test(html), "no event handler may be introduced");
});

// The alt is the only description of the picture this module can reach.
test("the dispatcher uses the beat's description, falling back to its text", () => {
  const withDescription = mulmoBeatSchema.parse({ description: "a cat", text: "spoken", image: { type: "image", source: URL_SRC } });
  assert.match(beatToHtml(withDescription, { idPrefix: "b" })!.html, /alt="a cat"/);
  const withText = mulmoBeatSchema.parse({ text: "spoken", image: { type: "image", source: URL_SRC } });
  assert.match(beatToHtml(withText, { idPrefix: "b" })!.html, /alt="spoken"/);
  const withNeither = mulmoBeatSchema.parse({ image: { type: "image", source: URL_SRC } });
  assert.match(beatToHtml(withNeither, { idPrefix: "b" })!.html, /alt=""/);
});
