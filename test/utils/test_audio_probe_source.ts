import test from "node:test";
import assert from "node:assert";
import { audioProbeSource, isStillImageFile } from "../../src/utils/audio_probe_source.js";

test("isStillImageFile: still image extensions, any case, with a query or fragment", () => {
  ["a.png", "a.jpg", "a.jpeg", "a.gif", "a.webp", "a.bmp", "a.svg", "/x/A.PNG", "https://h/p/a.jpg?w=1", "https://h/a.png#x"].forEach((file) => {
    assert.strictEqual(isStillImageFile(file), true, file);
  });
});

test("isStillImageFile: video, audio, extensionless and empty paths are not still images", () => {
  ["a.mp4", "a.mov", "a.webm", "a.mp3", "a", "", "https://h/video?f=a.png", "a.png.mp4"].forEach((file) => {
    assert.strictEqual(isStillImageFile(file), false, file);
  });
});

test("audioProbeSource: a movie file is always probed, even next to a still image", () => {
  assert.strictEqual(audioProbeSource({ movieFile: "m.mp4", imageFile: "i.png" }), "m.mp4");
  assert.strictEqual(audioProbeSource({ movieFile: "m.mp4" }), "m.mp4");
});

test("audioProbeSource: a still image alone is not probed", () => {
  assert.strictEqual(audioProbeSource({ imageFile: "/out/0p.png" }), undefined);
  assert.strictEqual(audioProbeSource({ movieFile: "", imageFile: "https://h/a.JPG" }), undefined);
});

test("audioProbeSource: a non-image file in the image slot is still probed", () => {
  assert.strictEqual(audioProbeSource({ imageFile: "/out/0p.mp4" }), "/out/0p.mp4");
  assert.strictEqual(audioProbeSource({ imageFile: "/out/noext" }), "/out/noext");
});

test("audioProbeSource: nothing to probe", () => {
  assert.strictEqual(audioProbeSource({}), undefined);
  assert.strictEqual(audioProbeSource({ movieFile: "", imageFile: "" }), undefined);
});
