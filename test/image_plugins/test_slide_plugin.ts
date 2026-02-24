import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { ImageProcessorParams } from "../../src/types/index.js";

const validTheme = {
  colors: {
    bg: "0F172A",
    bgCard: "1E293B",
    bgCardAlt: "334155",
    text: "FFFFFF",
    textMuted: "CBD5E1",
    textDim: "64748B",
    primary: "3B82F6",
    accent: "8B5CF6",
    success: "22C55E",
    warning: "F97316",
    danger: "EF4444",
    info: "14B8A6",
    highlight: "EC4899",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
};

const altTheme = {
  colors: {
    bg: "FFFFFF",
    bgCard: "F1F5F9",
    bgCardAlt: "E2E8F0",
    text: "0F172A",
    textMuted: "475569",
    textDim: "94A3B8",
    primary: "2563EB",
    accent: "7C3AED",
    success: "16A34A",
    warning: "EA580C",
    danger: "DC2626",
    info: "0D9488",
    highlight: "DB2777",
  },
  fonts: { title: "Arial", body: "Helvetica", mono: "Monaco" },
};

test("slide plugin basic functionality", () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert.strictEqual(plugin.imageType, "slide");
});

test("slide plugin path function", () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "slide",
        theme: validTheme,
        slide: { layout: "title", title: "Test" },
      },
    },
  } as ImageProcessorParams;

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/image.png");
});

test("slide plugin html uses beat.image.theme when provided", async () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert(plugin.html, "slide plugin should have html function");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "slide",
        theme: validTheme,
        slide: { layout: "title", title: "Hello World" },
      },
    },
    context: {
      presentationStyle: {},
    },
  } as ImageProcessorParams;

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("Hello World"), "HTML should contain slide title");
  assert(html.includes("Georgia"), "HTML should contain theme font");
});

test("slide plugin html falls back to slideParams.theme when beat theme is missing", async () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert(plugin.html, "slide plugin should have html function");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "slide",
        slide: { layout: "title", title: "Fallback Test" },
      },
    },
    context: {
      presentationStyle: {
        slideParams: {
          theme: validTheme,
        },
      },
    },
  } as ImageProcessorParams;

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("Fallback Test"), "HTML should contain slide title");
  assert(html.includes("Georgia"), "HTML should use slideParams theme font");
});

test("slide plugin html uses beat theme over slideParams theme (override)", async () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert(plugin.html, "slide plugin should have html function");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "slide",
        theme: altTheme,
        slide: { layout: "title", title: "Override Test" },
      },
    },
    context: {
      presentationStyle: {
        slideParams: {
          theme: validTheme,
        },
      },
    },
  } as ImageProcessorParams;

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("Arial"), "HTML should use beat-level theme font (Arial), not slideParams font (Georgia)");
  assert(!html.includes("Georgia"), "HTML should NOT use slideParams theme font when beat theme is provided");
});

test("slide plugin html uses corporate theme as default when both themes are missing", async () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert(plugin.html, "slide plugin should have html function");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "slide",
        slide: { layout: "title", title: "No Theme" },
      },
    },
    context: {
      presentationStyle: {},
    },
  } as ImageProcessorParams;

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated with default corporate theme");
  assert(typeof html === "string", "HTML should be a string");
});

test("slide plugin html returns undefined for non-slide beat", async () => {
  const plugin = findImagePlugin("slide");
  assert(plugin, "slide plugin should exist");
  assert(plugin.html, "slide plugin should have html function");

  const mockParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: { title: "Not a slide" },
      },
    },
    context: {
      presentationStyle: {},
    },
  } as ImageProcessorParams;

  const html = await plugin.html(mockParams);
  assert.strictEqual(html, undefined);
});
