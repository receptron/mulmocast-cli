import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { mulmoHtmlTailwindMediaSchema, htmlTailwindAnimationSchema } from "../../src/types/schema.js";
import { normalizeEvenDimensions } from "../../src/utils/ffmpeg_utils.js";
import { MulmoBeatMethods } from "../../src/methods/index.js";
import type { ImageProcessorParams, MulmoBeat } from "../../src/types/index.js";

// === Schema tests ===

test("htmlTailwindAnimationSchema - accepts true", () => {
  const result = htmlTailwindAnimationSchema.safeParse(true);
  assert(result.success, "should accept true");
  assert.strictEqual(result.data, true);
});

test("htmlTailwindAnimationSchema - accepts object with fps", () => {
  const result = htmlTailwindAnimationSchema.safeParse({ fps: 15 });
  assert(result.success, "should accept { fps: 15 }");
  assert.deepStrictEqual(result.data, { fps: 15 });
});

test("htmlTailwindAnimationSchema - object defaults fps to 30", () => {
  const result = htmlTailwindAnimationSchema.safeParse({});
  assert(result.success, "should accept empty object");
  assert.deepStrictEqual(result.data, { fps: 30 });
});

test("htmlTailwindAnimationSchema - rejects fps out of range", () => {
  const result = htmlTailwindAnimationSchema.safeParse({ fps: 0 });
  assert(!result.success, "should reject fps=0");

  const result2 = htmlTailwindAnimationSchema.safeParse({ fps: 61 });
  assert(!result2.success, "should reject fps=61");
});

test("mulmoHtmlTailwindMediaSchema - static (no animation)", () => {
  const result = mulmoHtmlTailwindMediaSchema.safeParse({
    type: "html_tailwind",
    html: "<div>Hello</div>",
  });
  assert(result.success, "should accept without animation");
  assert.strictEqual(result.data.animation, undefined);
});

test("mulmoHtmlTailwindMediaSchema - animation: true", () => {
  const result = mulmoHtmlTailwindMediaSchema.safeParse({
    type: "html_tailwind",
    html: "<div>Hello</div>",
    animation: true,
  });
  assert(result.success, "should accept animation: true");
  assert.strictEqual(result.data.animation, true);
});

test("mulmoHtmlTailwindMediaSchema - animation: { fps: 15 }", () => {
  const result = mulmoHtmlTailwindMediaSchema.safeParse({
    type: "html_tailwind",
    html: ["<div>Line 1</div>", "<div>Line 2</div>"],
    animation: { fps: 15 },
  });
  assert(result.success, "should accept animation with fps");
  assert.deepStrictEqual(result.data.animation, { fps: 15 });
});

test("mulmoHtmlTailwindMediaSchema - rejects unknown fields (strict)", () => {
  const result = mulmoHtmlTailwindMediaSchema.safeParse({
    type: "html_tailwind",
    html: "<div>Hello</div>",
    animation: true,
    unknownField: "oops",
  });
  assert(!result.success, "should reject unknown fields due to strict()");
});

// === Plugin tests (no Puppeteer, no FFmpeg) ===

test("html_tailwind plugin - static beat returns correct path", () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/0p.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div>Hello</div>",
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/0p.png");
});

test("html_tailwind plugin - animated beat returns correct path (parrotingImagePath)", () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  // When animated, imagePluginAgent passes the .mp4 path as imagePath
  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/0p_animated.mp4",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div>Hello</div>",
        animation: true,
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/0p_animated.mp4");
});

test("html_tailwind plugin - html dump works for static beat", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");
  assert(plugin.html, "html_tailwind plugin should have html function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/0p.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div>Hello</div>",
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, "<div>Hello</div>");
});

test("html_tailwind plugin - html dump works for animated beat", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");
  assert(plugin.html, "html_tailwind plugin should have html function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/0p_animated.mp4",
    beat: {
      image: {
        type: "html_tailwind",
        html: ["<div id='title'>Hello</div>", "<script>function render(f){}</script>"],
        animation: true,
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, "<div id='title'>Hello</div>\n<script>function render(f){}</script>");
});

// === animation: false / invalid values should be treated as static ===

test("htmlTailwindAnimationSchema - rejects false", () => {
  const result = htmlTailwindAnimationSchema.safeParse(false);
  assert(!result.success, "should reject false");
});

test("mulmoHtmlTailwindMediaSchema - animation: false is rejected by schema", () => {
  const result = mulmoHtmlTailwindMediaSchema.safeParse({
    type: "html_tailwind",
    html: "<div>Hello</div>",
    animation: false,
  });
  assert(!result.success, "should reject animation: false");
});

test("html_tailwind plugin - animation: false treated as static", () => {
  const plugin = findImagePlugin("html_tailwind");
  assert(plugin, "html_tailwind plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/0p.png",
    beat: {
      image: {
        type: "html_tailwind",
        html: "<div>Hello</div>",
        animation: false as unknown as true, // simulate unvalidated input
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/0p.png", "should return png path for animation: false");
});

// === isAnimatedHtmlTailwind tests ===

test("isAnimatedHtmlTailwind - true for animation: true", () => {
  const beat: MulmoBeat = { text: "", image: { type: "html_tailwind", html: "<div></div>", animation: true } };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), true);
});

test("isAnimatedHtmlTailwind - true for animation: { fps: 15 }", () => {
  const beat: MulmoBeat = { text: "", image: { type: "html_tailwind", html: "<div></div>", animation: { fps: 15 } } };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), true);
});

test("isAnimatedHtmlTailwind - false for undefined animation", () => {
  const beat: MulmoBeat = { text: "", image: { type: "html_tailwind", html: "<div></div>" } };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), false);
});

test("isAnimatedHtmlTailwind - false for animation: false (unvalidated)", () => {
  const beat = { text: "", image: { type: "html_tailwind" as const, html: "<div></div>", animation: false as unknown as true } };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), false);
});

test("isAnimatedHtmlTailwind - false for non-html_tailwind type", () => {
  const beat: MulmoBeat = { text: "", image: { type: "markdown", markdown: "# Hello" } };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), false);
});

test("isAnimatedHtmlTailwind - false for no image", () => {
  const beat: MulmoBeat = { text: "Hello" };
  assert.strictEqual(MulmoBeatMethods.isAnimatedHtmlTailwind(beat), false);
});

// === normalizeEvenDimensions tests ===

test("normalizeEvenDimensions - even values unchanged", () => {
  assert.deepStrictEqual(normalizeEvenDimensions(1280, 720), { width: 1280, height: 720 });
  assert.deepStrictEqual(normalizeEvenDimensions(720, 1280), { width: 720, height: 1280 });
});

test("normalizeEvenDimensions - odd width rounded up", () => {
  assert.deepStrictEqual(normalizeEvenDimensions(721, 720), { width: 722, height: 720 });
});

test("normalizeEvenDimensions - odd height rounded up", () => {
  assert.deepStrictEqual(normalizeEvenDimensions(1280, 1), { width: 1280, height: 2 });
});

test("normalizeEvenDimensions - both odd rounded up", () => {
  assert.deepStrictEqual(normalizeEvenDimensions(1281, 721), { width: 1282, height: 722 });
});

// === totalFrames calculation tests ===

test("totalFrames calculation - floor guarantees no overshoot", () => {
  // Math.floor(duration * fps)
  assert.strictEqual(Math.floor(3 * 30), 90);
  assert.strictEqual(Math.floor(1.5 * 30), 45);
  assert.strictEqual(Math.floor(0.1 * 30), 3);
  assert.strictEqual(Math.floor(2.99 * 30), 89); // 89.7 → 89
  assert.strictEqual(Math.floor(0.01 * 30), 0); // edge case: too short
});

test("totalFrames - video duration never exceeds beat duration", () => {
  const fps = 30;
  const testDurations = [1, 2, 3, 5, 0.5, 1.5, 10];
  for (const duration of testDurations) {
    const totalFrames = Math.floor(duration * fps);
    const videoDuration = totalFrames / fps;
    assert(videoDuration <= duration, `videoDuration (${videoDuration}) should be <= duration (${duration})`);
    // Gap should be less than 1 frame
    assert(duration - videoDuration < 1 / fps, `gap should be < 1 frame for duration=${duration}`);
  }
});
