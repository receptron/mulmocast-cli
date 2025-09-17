import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { ImageProcessorParams } from "../../src/types/index.js";

test("text_slide plugin basic functionality", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert.strictEqual(plugin.imageType, "textSlide");
});

test("text_slide plugin path function", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          title: "Test Title",
        },
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/image.png");
});

test("text_slide plugin markdown generation with title only", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.markdown, "textSlide plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          title: "Test Title",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "# Test Title\n");
});

test("text_slide plugin markdown generation with title and subtitle", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.markdown, "textSlide plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          title: "Test Title",
          subtitle: "Test Subtitle",
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "# Test Title\n## Test Subtitle\n");
});

test("text_slide plugin markdown generation with title, subtitle, and bullets", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.markdown, "textSlide plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          title: "Test Title",
          subtitle: "Test Subtitle",
          bullets: ["Point 1", "Point 2", "Point 3"],
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "# Test Title\n## Test Subtitle\n- Point 1\n- Point 2\n- Point 3");
});

test("text_slide plugin markdown generation with bullets only", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.markdown, "textSlide plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          bullets: ["Bullet A", "Bullet B"],
        },
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "- Bullet A\n- Bullet B");
});

test("text_slide plugin markdown generation with empty slide", () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.markdown, "textSlide plugin should have markdown function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {},
      },
    },
  };

  const markdown = plugin.markdown(mockParams);
  assert.strictEqual(markdown, "");
});


test("text_slide plugin html generation", async () => {
  const plugin = findImagePlugin("textSlide");
  assert(plugin, "textSlide plugin should exist");
  assert(plugin.html, "textSlide plugin should have html function");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: {
          title: "Test Title",
          bullets: ["Point 1", "Point 2"],
        },
      },
    },
  };

  const html = await plugin.html(mockParams);
  assert(html, "HTML should be generated");
  assert(html.includes("<h1>Test Title</h1>"), "HTML should contain title");
  assert(html.includes("<li>Point 1</li>"), "HTML should contain bullet points");
  assert(html.includes("<li>Point 2</li>"), "HTML should contain bullet points");
});
