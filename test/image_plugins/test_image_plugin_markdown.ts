import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin markdown - basic functionality", async () => {
  const plugin = findImagePlugin("markdown");
  assert.equal(plugin.imageType, "markdown");
});

test("test imagePlugin markdown - markdown method with array", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {
    image: {
      type: "markdown",
      markdown: ["# Title", "", "- Item 1", "- Item 2"],
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "# Title\n\n- Item 1\n- Item 2");

  const htmlResult = await plugin.html({ beat });
  assert.equal(htmlResult, ["<h1>Title</h1>", "<ul>", "<li>Item 1</li>", "<li>Item 2</li>", "</ul>"].join("\n") + "\n");
});

test("test imagePlugin markdown - markdown method with string", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {
    image: {
      type: "markdown",
      markdown: "# Single Title\n\nParagraph text",
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "# Single Title\n\nParagraph text");
});

test("test imagePlugin markdown - html method converts markdown to html", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {
    image: {
      type: "markdown",
      markdown: ["# Heading", "", "**Bold text**"],
    },
  };

  const result = await plugin.html({ beat });
  assert(result.includes("<h1>"));
  assert(result.includes("<strong>Bold text</strong>"));
});

test("test imagePlugin markdown - methods with wrong type", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {
    image: {
      type: "html_tailwind",
      markdown: "# Test",
    },
  };

  const markdownResult = plugin.markdown({ beat });
  const htmlResult = await plugin.html({ beat });

  assert.equal(markdownResult, undefined);
  assert.equal(htmlResult, "");
});

test("test imagePlugin markdown - methods with no image", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {};

  const markdownResult = plugin.markdown({ beat });
  const htmlResult = await plugin.html({ beat });

  assert.equal(markdownResult, undefined);
  assert.equal(htmlResult, "");
});

test("test imagePlugin textSlide - markdown method with slide data", async () => {
  const plugin = findImagePlugin("textSlide");
  const beat = {
    image: {
      type: "textSlide",
      slide: {
        title: "Main Title",
        subtitle: "Subtitle Here",
        bullets: ["First bullet", "Second bullet", "Third bullet"],
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "# Main Title\n## Subtitle Here\n- First bullet\n- Second bullet\n- Third bullet");
});

test("test imagePlugin textSlide - markdown method with only title", async () => {
  const plugin = findImagePlugin("textSlide");
  const beat = {
    image: {
      type: "textSlide",
      slide: {
        title: "Only Title",
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "# Only Title\n");
});

test("test imagePlugin textSlide - markdown method with bullets only", async () => {
  const plugin = findImagePlugin("textSlide");
  const beat = {
    image: {
      type: "textSlide",
      slide: {
        bullets: ["Item 1", "Item 2"],
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "- Item 1\n- Item 2");
});

test("test imagePlugin textSlide - html method converts slide to html", async () => {
  const plugin = findImagePlugin("textSlide");
  const beat = {
    image: {
      type: "textSlide",
      slide: {
        title: "Test Title",
        bullets: ["**Bold item**"],
      },
    },
  };

  const result = await plugin.html({ beat });
  assert(result.includes("<h1>Test Title</h1>"));
  assert(result.includes("<strong>Bold item</strong>"));
});

test("test imagePlugin mermaid - markdown method with text code", async () => {
  const plugin = findImagePlugin("mermaid");
  const beat = {
    image: {
      type: "mermaid",
      code: {
        kind: "text",
        text: "graph TD\n  A --> B",
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "```mermaid\ngraph TD\n  A --> B\n```");
});

test("test imagePlugin mermaid - markdown method with non-text code", async () => {
  const plugin = findImagePlugin("mermaid");
  const beat = {
    image: {
      type: "mermaid",
      code: {
        kind: "url",
        url: "https://example.com",
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, undefined);
});

test("test imagePlugin mermaid - markdown method with wrong type", async () => {
  const plugin = findImagePlugin("mermaid");
  const beat = {
    image: {
      type: "chart",
      code: {
        kind: "text",
        text: "graph TD\n  A --> B",
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, undefined);
});

test("test imagePlugin markdown - markdown method with object", async () => {
  const plugin = findImagePlugin("markdown");
  const beat = {
    image: {
      type: "markdown",
      markdown: {
        header: "# Title",
        body: ["- Item 1", "- Item 2"],
      },
    },
  };

  const result = plugin.markdown({ beat });
  assert.equal(result, "# Title\n\n- Item 1\n- Item 2");

  const htmlResult = await plugin.html({ beat });
  assert.equal(htmlResult, ["<h1>Title</h1>", "<ul>", "<li>Item 1</li>", "<li>Item 2</li>", "</ul>"].join("\n") + "\n");
});
