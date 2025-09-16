import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin markdown", async () => {
  const plugin = findImagePlugin("markdown");
  assert.equal(plugin.imageType, "markdown");

  const path = await plugin.html({ beat: { image: {type: "markdown", markdown: ["#123", "", "- aa"]} }});
  assert.equal(path, "<p>#123</p>\n<ul>\n<li>aa</li>\n</ul>\n");
});

