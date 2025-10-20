import test from "node:test";
import assert from "node:assert";
import { findImagePlugin } from "../../src/utils/image_plugins/index.js";
import { ImageProcessorParams } from "../../src/types/index.js";

// Image plugin tests
test("image plugin basic functionality", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");
  assert.strictEqual(plugin.imageType, "image");
});

test("image plugin path with URL source", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "image",
        source: {
          kind: "url",
          url: "https://example.com/image.jpg",
        },
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/image.png");
});

test("image plugin path with path source", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "image",
        source: {
          kind: "path",
          path: "assets/image.jpg",
        },
      },
    },
    context: {
      fileDirs: {
        mulmoFileDirPath: "/project",
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/project/assets/image.jpg");
});

test("image plugin path with relative path source", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "image",
        source: {
          kind: "path",
          path: "./images/photo.png",
        },
      },
    },
    context: {
      fileDirs: {
        mulmoFileDirPath: "/home/user/project",
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/home/user/project/images/photo.png");
});

test("image plugin path with wrong image type", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "textSlide",
        slide: { title: "Not an image" },
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, undefined);
});

// Movie plugin tests
test("movie plugin basic functionality", () => {
  const plugin = findImagePlugin("movie");
  assert(plugin, "movie plugin should exist");
  assert.strictEqual(plugin.imageType, "movie");
});

test("movie plugin path with URL source", () => {
  const plugin = findImagePlugin("movie");
  assert(plugin, "movie plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/movie.png",
    beat: {
      image: {
        type: "movie",
        source: {
          kind: "url",
          url: "https://example.com/video.mp4",
        },
      },
    },
  };

  // Should change extension from .png to .mov for movies
  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/movie.mov");
});

test("movie plugin path with path source", () => {
  const plugin = findImagePlugin("movie");
  assert(plugin, "movie plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/movie.png",
    beat: {
      image: {
        type: "movie",
        source: {
          kind: "path",
          path: "videos/presentation.mp4",
        },
      },
    },
    context: {
      fileDirs: {
        mulmoFileDirPath: "/project",
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/project/videos/presentation.mp4");
});

test("movie plugin path extension fix", () => {
  const plugin = findImagePlugin("movie");
  assert(plugin, "movie plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/video.png",
    beat: {
      image: {
        type: "movie",
        source: {
          kind: "url",
          url: "https://example.com/clip.mov",
        },
      },
    },
  };

  const path = plugin.path(mockParams);
  // Should convert .png to .mov for movies
  assert.strictEqual(path, "/test/path/video.mov");
});

test("movie plugin path with .mov already in imagePath", () => {
  const plugin = findImagePlugin("movie");
  assert(plugin, "movie plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/video.mov",
    beat: {
      image: {
        type: "movie",
        source: {
          kind: "url",
          url: "https://example.com/clip.mp4",
        },
      },
    },
  };

  const path = plugin.path(mockParams);
  assert.strictEqual(path, "/test/path/video.mov");
});

// Edge cases for both image and movie plugins
test("source plugins with no image property", () => {
  const imagePlugin = findImagePlugin("image");
  const moviePlugin = findImagePlugin("movie");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/file.png",
    beat: {},
  };

  const imagePath = imagePlugin?.path(mockParams);
  const moviePath = moviePlugin?.path(mockParams);

  assert.strictEqual(imagePath, undefined);
  assert.strictEqual(moviePath, undefined);
});

test("source plugins with unknown source kind", () => {
  const imagePlugin = findImagePlugin("image");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "image",
        source: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          kind: "unknown" as any,
          data: "some data",
        },
      },
    },
    context: {
      fileDirs: {
        mulmoFileDirPath: "/project",
      },
    },
  };

  const path = imagePlugin?.path(mockParams);
  assert.strictEqual(path, undefined);
});

test("image plugin with absolute path source", () => {
  const plugin = findImagePlugin("image");
  assert(plugin, "image plugin should exist");

  const mockParams: ImageProcessorParams = {
    imagePath: "/test/path/image.png",
    beat: {
      image: {
        type: "image",
        source: {
          kind: "path",
          path: "/absolute/path/to/image.jpg",
        },
      },
    },
    context: {
      fileDirs: {
        mulmoFileDirPath: "/project",
      },
    },
  };

  const path = plugin.path(mockParams);
  // Absolute paths should be used as-is
  assert.strictEqual(path, "/absolute/path/to/image.jpg");
});
