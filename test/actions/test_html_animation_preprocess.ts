import test from "node:test";
import assert from "node:assert";
import { imagePreprocessAgent } from "../../src/actions/image_agents.js";
import { createMockContext, createMockBeat } from "./utils.js";

test("imagePreprocessAgent - animated html_tailwind sets movieFile to .mp4 path", async () => {
  const context = createMockContext();
  // Add a beat to the script so getBeatAnimatedVideoPath can read it
  context.studio.script.beats = [{ text: "", duration: 3 }];
  context.studio.beats = [{}];

  const beat = createMockBeat({
    text: "",
    duration: 3,
    image: {
      type: "html_tailwind",
      html: "<div>Animated</div>",
      animation: true,
    },
  });

  const result = await imagePreprocessAgent({
    context,
    beat,
    index: 0,
    imageRefs: {},
  });

  // movieFile should be .mp4, NOT .png
  assert("movieFile" in result, "result should have movieFile");
  assert(result.movieFile?.endsWith("_animated.mp4"), `movieFile should end with _animated.mp4, got: ${result.movieFile}`);

  // imagePath should be .png (for thumbnail)
  assert("imagePath" in result, "result should have imagePath");
  assert(result.imagePath?.endsWith(".png"), `imagePath should end with .png, got: ${result.imagePath}`);

  // imageFromMovie should be true (triggers extractImageFromMovie)
  assert("imageFromMovie" in result, "result should have imageFromMovie");
  assert.strictEqual((result as { imageFromMovie: boolean }).imageFromMovie, true);
});

test("imagePreprocessAgent - static html_tailwind has no movieFile", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "Hello" }];
  context.studio.beats = [{}];

  const beat = createMockBeat({
    text: "Hello",
    image: {
      type: "html_tailwind",
      html: "<div>Static</div>",
      // no animation field
    },
  });

  const result = await imagePreprocessAgent({
    context,
    beat,
    index: 0,
    imageRefs: {},
  });

  // movieFile should be undefined for static html_tailwind
  assert("movieFile" in result, "result should have movieFile field");
  assert.strictEqual(result.movieFile, undefined, "movieFile should be undefined for static beat");

  // imagePath should be .png
  assert("imagePath" in result, "result should have imagePath");
  assert(result.imagePath?.endsWith(".png"), `imagePath should end with .png, got: ${result.imagePath}`);

  // imageFromMovie should be false
  assert("imageFromMovie" in result, "result should have imageFromMovie");
  assert.strictEqual((result as { imageFromMovie: boolean }).imageFromMovie, false);
});

test("imagePreprocessAgent - animated html_tailwind + moviePrompt throws", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "", duration: 3 }];
  context.studio.beats = [{}];

  const beat = createMockBeat({
    text: "",
    duration: 3,
    image: {
      type: "html_tailwind",
      html: "<div>Animated</div>",
      animation: true,
    },
    moviePrompt: "some movie prompt",
  });

  await assert.rejects(
    () =>
      imagePreprocessAgent({
        context,
        beat,
        index: 0,
        imageRefs: {},
      }),
    (err: Error) => {
      assert(err.message.includes("cannot be used together"), `Expected rejection message about incompatibility, got: ${err.message}`);
      return true;
    },
  );
});

test("imagePreprocessAgent - animated html_tailwind with beat id uses id in path", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "", duration: 2, id: "intro_animation" }];
  context.studio.beats = [{}];

  const beat = createMockBeat({
    text: "",
    duration: 2,
    id: "intro_animation",
    image: {
      type: "html_tailwind",
      html: "<div>Intro</div>",
      animation: { fps: 15 },
    },
  });

  const result = await imagePreprocessAgent({
    context,
    beat,
    index: 0,
    imageRefs: {},
  });

  assert("movieFile" in result, "result should have movieFile");
  assert(result.movieFile?.includes("intro_animation"), `movieFile should contain beat id, got: ${result.movieFile}`);
  assert(result.movieFile?.endsWith("_animated.mp4"), `movieFile should end with _animated.mp4, got: ${result.movieFile}`);
});
