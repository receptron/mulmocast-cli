import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin html_tailwind - basic functionality", async () => {
  const plugin = findImagePlugin("html_tailwind");
  assert.equal(plugin.imageType, "html_tailwind");
});

test("test imagePlugin html_tailwind - html method with string", async () => {
  const plugin = findImagePlugin("html_tailwind");
  const beat = {
    image: {
      type: "html_tailwind",
      html: "<div class='text-blue-500'>Hello World</div>",
    },
  };

  const result = await plugin.html({ beat });
  assert.equal(result, "<div class='text-blue-500'>Hello World</div>");
});

test("test imagePlugin html_tailwind - html method with array", async () => {
  const plugin = findImagePlugin("html_tailwind");
  const beat = {
    image: {
      type: "html_tailwind",
      html: ["<h1 class='text-xl font-bold'>Title</h1>", "<p>Paragraph</p>"],
    },
  };

  const result = await plugin.html({ beat });
  assert.equal(result, "<h1 class='text-xl font-bold'>Title</h1>\n<p>Paragraph</p>");
});

test("test imagePlugin html_tailwind - html method with wrong type", async () => {
  const plugin = findImagePlugin("html_tailwind");
  const beat = {
    image: {
      type: "markdown",
      html: "<div>Test</div>",
    },
  };

  const result = await plugin.html({ beat });
  assert.equal(result, undefined);
});

test("test imagePlugin html_tailwind - html method with no image", async () => {
  const plugin = findImagePlugin("html_tailwind");
  const beat = {};

  const result = await plugin.html({ beat });
  assert.equal(result, undefined);
});
