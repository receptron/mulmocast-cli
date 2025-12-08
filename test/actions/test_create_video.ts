import test from "node:test";
import assert from "node:assert";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { createVideo } from "../../src/actions/movie.js";
import type { MulmoStudioContext, MulmoScript } from "../../src/types/index.js";

// Helper function to create a minimal context from a script
const createContextFromScript = (script: MulmoScript): MulmoStudioContext => {
  // Create studio beats from script beats
  const studioBeats = script.beats.map((beat) => ({
    imageFile: "/dummy/image.png", // Dummy file path for testing
    duration: 5.0, // Default duration
  }));

  return {
    lang: script.lang || "en",
    studio: {
      script,
      beats: studioBeats,
    },
    presentationStyle: {
      audioParams: {
        introPadding: 0,
        outroPadding: 0,
      },
      imageParams: {},
      canvasSize: script.canvasSize || { width: 1280, height: 720 },
    },
  } as MulmoStudioContext;
};

const getMulmoScript = (filePath: string) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const scriptPath = join(__dirname, "../../scripts", filePath);
  const scriptContent = readFileSync(scriptPath, "utf-8");
  const script: MulmoScript = JSON.parse(scriptContent);
  return script;
};

test("test createVideo with fsd_demo.json in testMode", async () => {
  // Load the fsd_demo.json script
  const script = getMulmoScript("snakajima/fsd_demo.json");

  // Create context from script
  const context = createContextFromScript(script);

  // Call createVideo in test mode
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1080:h=1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1080:h=1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo filterComplex structure", async () => {
  // Create a minimal script with 2 beats
  const script: MulmoScript = {
    $mulmocast: { version: "1.1" },
    lang: "en",
    title: "Test Video",
    beats: [
      {
        speaker: "A",
        text: "First beat",
        image: {
          type: "textSlide",
          slide: { title: "Slide 1" },
        },
      },
      {
        speaker: "B",
        text: "Second beat",
        image: {
          type: "textSlide",
          slide: { title: "Slide 2" },
        },
      },
    ],
  };

  const context = createContextFromScript(script);

  // Call createVideo in test mode
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});
