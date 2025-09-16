import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin markdown", async () => {
  const plugin = findImagePlugin("markdown");
  assert.equal(plugin.imageType, "markdown");

  const path = plugin.markdown({ beat: { image: {type: "markdown", markdown: ["#123", "", "- aa"]} }});
  assert.equal(path, "#123\n\n- aa");
});

