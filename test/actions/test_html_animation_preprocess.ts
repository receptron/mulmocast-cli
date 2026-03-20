import test from "node:test";
import assert from "node:assert";
import { imagePreprocessAgent } from "../../src/actions/image_agents.js";
import { createMockContext, createMockBeat } from "./utils.js";

test("imagePreprocessAgent - animated html_tailwind WITH duration sets movieFile and imageFromMovie", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "", duration: 3 }];
  context.studio.beats = [{ duration: 3 }];

  const beat = createMockBeat({
    text: "",
    duration: 3,
    image: {
      type: "html_tailwind",
      html: "<div>Animated</div>",
      animation: true,
    },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  // Movie workflow: movieFile should be .mp4
  assert("movieFile" in result, "result should have movieFile");
  assert(result.movieFile?.endsWith("_animated.mp4"), `movieFile should end with _animated.mp4, got: ${result.movieFile}`);

  // imagePath should be .png (for thumbnail extraction)
  assert("imagePath" in result, "result should have imagePath");
  assert(result.imagePath?.endsWith(".png"), `imagePath should end with .png, got: ${result.imagePath}`);

  // imageFromMovie should be true (triggers extractImageFromMovie)
  assert.strictEqual((result as { imageFromMovie: boolean }).imageFromMovie, true, "imageFromMovie should be true when duration is available");
});

test("imagePreprocessAgent - animated html_tailwind WITHOUT duration has no movieFile", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "" }];
  context.studio.beats = [{}]; // no duration (audio not generated yet)

  const beat = createMockBeat({
    text: "",
    // no duration
    image: {
      type: "html_tailwind",
      html: "<div>Animated</div>",
      animation: true,
    },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  // PDF/images workflow: no movieFile (avoids audioChecker referencing non-existent .mp4)
  assert.strictEqual(result.movieFile, undefined, "movieFile should be undefined when duration is unavailable");

  // imagePath should be .png
  assert("imagePath" in result, "result should have imagePath");
  assert(result.imagePath?.endsWith(".png"), `imagePath should end with .png, got: ${result.imagePath}`);

  // imageFromMovie should not be set
  assert(
    !("imageFromMovie" in result) || !(result as { imageFromMovie?: boolean }).imageFromMovie,
    "imageFromMovie should not be true when duration is unavailable",
  );
});

test("imagePreprocessAgent - animated html_tailwind with studioBeat.duration (audio-derived)", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "" }]; // no beat.duration in script
  context.studio.beats = [{ duration: 14.5 }]; // duration set by audio generation

  const beat = createMockBeat({
    text: "",
    // no beat.duration — relies on studioBeat.duration
    image: {
      type: "html_tailwind",
      html: "<div>Animated</div>",
      animation: { movie: true },
    },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  // Should detect duration from studioBeat and enable movie workflow
  assert("movieFile" in result, "result should have movieFile");
  assert(result.movieFile?.endsWith("_animated.mp4"), `movieFile should end with _animated.mp4, got: ${result.movieFile}`);
  assert.strictEqual((result as { imageFromMovie: boolean }).imageFromMovie, true, "imageFromMovie should be true");
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
    },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  assert("movieFile" in result, "result should have movieFile field");
  assert.strictEqual(result.movieFile, undefined, "movieFile should be undefined for static beat");
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
    () => imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} }),
    (err: Error) => {
      assert(err.message.includes("cannot be used together"), `Expected rejection message about incompatibility, got: ${err.message}`);
      return true;
    },
  );
});

test("imagePreprocessAgent - animation: false treated as static", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "Hello", duration: 3 }];
  context.studio.beats = [{}];

  const beat = createMockBeat({
    text: "Hello",
    duration: 3,
    image: {
      type: "html_tailwind",
      html: "<div>Static</div>",
      animation: false as unknown as true,
    },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  assert("movieFile" in result, "result should have movieFile field");
  assert.strictEqual(result.movieFile, undefined, "movieFile should be undefined for animation: false");
  assert("imageFromMovie" in result, "result should have imageFromMovie");
  assert.strictEqual((result as { imageFromMovie: boolean }).imageFromMovie, false);
});

test("imagePreprocessAgent - animated html_tailwind with beat id uses id in path", async () => {
  const context = createMockContext();
  context.studio.script.beats = [{ text: "", duration: 2, id: "intro_animation" }];
  context.studio.beats = [{ duration: 2 }];

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

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} });

  assert("movieFile" in result, "result should have movieFile");
  assert(result.movieFile?.includes("intro_animation"), `movieFile should contain beat id, got: ${result.movieFile}`);
  assert(result.movieFile?.endsWith("_animated.mp4"), `movieFile should end with _animated.mp4, got: ${result.movieFile}`);
});
