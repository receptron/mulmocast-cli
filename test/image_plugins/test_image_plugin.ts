import { findImagePlugin } from "../../src/utils/image_plugins/index.js";

import test from "node:test";
import assert from "node:assert";

test("test imagePlugin mermaid", async () => {
  const plugin = findImagePlugin("mermaid");
  assert.equal(plugin.imageType, "mermaid");

  const path = plugin.path({ imagePath: "expectImagePath" });
  assert.equal(path, "expectImagePath");
});

test("test imagePlugin image url", async () => {
  const plugin = findImagePlugin("image");
  assert.equal(plugin.imageType, "image");

  const path = plugin.path(
    {
      imagePath: "expectImagePath",
      beat: {
        image: {
          type: "image",
          source: { kind: "url", url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/min_anime.pn" },
        },
      },
    },
    {},
  );
  assert.equal(path, "expectImagePath");
});

test("test imagePlugin image path", async () => {
  const plugin = findImagePlugin("image");
  assert.equal(plugin.imageType, "image");

  const path = plugin.path({
    imagePath: "unexpectImagePath",
    beat: {
      image: {
        type: "image",
        source: { kind: "path", path: "expectImagePath" },
      },
    },
    context: { fileDirs: { mulmoFileDirPath: "/bin" } },
  });
  assert.equal(path, "/bin/expectImagePath");
});

test("test imagePlugin beat", async () => {
  const plugin = findImagePlugin("beat");
  assert.equal(plugin.imageType, "beat");

  const path = plugin.path({ type: "beat", imagePath: "expectImagePath" });
  assert.strictEqual(path, undefined);
});
