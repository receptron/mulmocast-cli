import test from "node:test";
import assert from "node:assert";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { safeMediaUrl } from "../../src/utils/beat_html/decoration.js";
import { pickBranding } from "../../src/utils/image_plugins/slide_branding.js";
import { mulmoBeatSchema } from "../../src/types/schema.js";
import { slideBrandingSchema } from "@mulmocast/deck";
import type { BeatHtmlOptions } from "../../src/utils/beat_html/type.js";

/**
 * The decorations the PNG render adds around a beat — a background image, a slide's branding and
 * reference line — and the resolution order it uses, carried over to the browser fragment.
 */

const BG = "https://example.com/bg.png";
const beat = (image: Record<string, unknown>) => mulmoBeatSchema.parse({ text: "t", image });
const render = (image: Record<string, unknown>, options: Partial<BeatHtmlOptions> = {}) => beatToHtml(beat(image), { idPrefix: "beat-1", ...options });
const textSlide = (over: Record<string, unknown> = {}) => ({ type: "textSlide", slide: { title: "T" }, ...over });
const chart = (over: Record<string, unknown> = {}) => ({
  type: "chart",
  title: "C",
  chartData: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } },
  ...over,
});
const mermaid = (over: Record<string, unknown> = {}) => ({ type: "mermaid", title: "M", code: { kind: "text", text: "graph TD; A-->B" }, ...over });
const slide = (over: Record<string, unknown> = {}) => ({ type: "slide", slide: { layout: "title", title: "S" }, ...over });
const urlSource = (url: string) => ({ source: { kind: "url", url } });

test("a beat without decorations renders as before: no documentCss, no branding layer", () => {
  assert.strictEqual("documentCss" in (render(textSlide()) ?? {}), false);
  assert.strictEqual("documentCss" in (render({ type: "markdown", markdown: "# M" }) ?? {}), false);
  assert.doesNotMatch(render(chart())?.html ?? "", /background-image/);
  assert.doesNotMatch(render(slide())?.html ?? "", /background-image|<img/);
});

test("a text beat's background becomes documentCss painted on body, as the PNG render paints it", () => {
  const plain = render(textSlide({ backgroundImage: BG }))?.documentCss ?? "";
  assert.match(plain, /body \{\s*background-image: url\('https:\/\/example\.com\/bg\.png'\);\s*background-size: cover;/);
  const faded = render(textSlide({ backgroundImage: { ...urlSource(BG), size: "fill", opacity: 0.4 } }))?.documentCss ?? "";
  assert.match(faded, /body::before \{[\s\S]*background-size: 100% 100%;[\s\S]*opacity: 0\.4;/);
  assert.match(render({ type: "markdown", markdown: "# M", backgroundImage: BG })?.documentCss ?? "", /url\('https:\/\/example\.com\/bg\.png'\)/);
});

test("background resolution: the beat's wins, a beat-level null switches the deck's off, a deck-level null is none", () => {
  const deck = { backgroundImage: "https://example.com/deck.png" };
  assert.match(render(textSlide(), deck)?.documentCss ?? "", /deck\.png/);
  assert.match(render(textSlide({ backgroundImage: BG }), deck)?.documentCss ?? "", /bg\.png/);
  assert.strictEqual(render(textSlide({ backgroundImage: null }), deck)?.documentCss, undefined);
  assert.strictEqual(render(textSlide(), { backgroundImage: null })?.documentCss, undefined);
});

test("a path is used as written by default and resolved by the host when it gives resolveMediaUrl; base64 is skipped", () => {
  const pathBg = { backgroundImage: { source: { kind: "path", path: "images/bg.png" } } };
  assert.match(render(textSlide(pathBg))?.documentCss ?? "", /url\('images\/bg\.png'\)/);
  const resolveMediaUrl = (source: { kind: string }) => (source.kind === "path" ? "/files/images/bg.png" : undefined);
  assert.match(render(textSlide(pathBg), { resolveMediaUrl })?.documentCss ?? "", /url\('\/files\/images\/bg\.png'\)/);
  assert.strictEqual(render(textSlide({ backgroundImage: { source: { kind: "base64", data: "AAAA" } } }))?.documentCss, undefined);
});

test("chart and mermaid backgrounds become the figure slide's background layer", () => {
  assert.match(render(chart({ backgroundImage: BG }))?.html ?? "", /background-image:url\('https:\/\/example\.com\/bg\.png'\)/);
  assert.match(render(mermaid({ backgroundImage: { ...urlSource(BG), opacity: 0.5 } }))?.html ?? "", /bg\.png[^"]*opacity:0\.5/);
  assert.match(render(chart(), { backgroundImage: BG })?.html ?? "", /bg\.png/);
  assert.doesNotMatch(render(chart({ backgroundImage: null }), { backgroundImage: BG })?.html ?? "", /bg\.png/);
});

test("a slide gets its branding — the beat's, else the deck's, none when the beat says null — and its reference line", () => {
  const logo = { logo: urlSource("https://example.com/logo.png") };
  assert.match(render(slide({ branding: logo }))?.html ?? "", /<img [^>]*src="https:\/\/example\.com\/logo\.png"/);
  assert.match(render(slide(), { branding: slideBrandingSchema.parse({ backgroundImage: urlSource(BG) }) })?.html ?? "", /bg\.png/);
  assert.doesNotMatch(render(slide({ branding: null }), { branding: slideBrandingSchema.parse(logo) })?.html ?? "", /logo\.png/);
  assert.match(render(slide({ reference: "Source: annual report" }))?.html ?? "", /Source: annual report/);
});

test("a url that would break out of url('…') or an attribute is percent-encoded, wherever it lands", () => {
  const hostile = "https://example.com/a'b\"c(d)e\\f<g>h i.png";
  assert.strictEqual(safeMediaUrl(hostile), "https://example.com/a%27b%22c%28d%29e%5Cf%3Cg%3Eh%20i.png");
  const css = render(textSlide({ backgroundImage: hostile }))?.documentCss ?? "";
  assert.match(css, /url\('https:\/\/example\.com\/a%27b%22c%28d%29e%5Cf%3Cg%3Eh%20i\.png'\)/);
  const html = render(slide({ branding: { logo: { source: { kind: "path", path: 'x" onerror="pwn()' } } } }))?.html ?? "";
  assert.doesNotMatch(html, /onerror="pwn/);
  assert.strictEqual(safeMediaUrl("data:image/png;base64,iVBOR/+="), "data:image/png;base64,iVBOR/+=", "an ordinary data url is untouched");
});

test("pickBranding over every combination of beat and deck branding", () => {
  const own = { logo: { source: { kind: "url" as const, url: "https://e.com/own.png" }, position: "top-right" as const, width: 120 } };
  const deck = { logo: { source: { kind: "url" as const, url: "https://e.com/deck.png" }, position: "top-right" as const, width: 120 } };
  assert.strictEqual(pickBranding(undefined, undefined), undefined);
  assert.strictEqual(pickBranding(undefined, deck), deck);
  assert.strictEqual(pickBranding(null, deck), undefined);
  assert.strictEqual(pickBranding(null, undefined), undefined);
  assert.strictEqual(pickBranding(own, deck), own);
  assert.strictEqual(pickBranding(own, undefined), own);
});
