import { requireImagePlugin } from "./utils.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin mermaid", async () => {
  const plugin = requireImagePlugin("vision");
  assert.equal(plugin.imageType, "vision");

  // const path = plugin.path({ imagePath: "expectImagePath" });
  // assert.equal(path, "expectImagePath");
});
