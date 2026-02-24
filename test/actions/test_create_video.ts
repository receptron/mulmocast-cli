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
  const studioBeats = script.beats.map((__beat) => ({
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

test("test createVideo with gpt.json", async () => {
  const script = getMulmoScript("test/gpt.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

// Skipping mulmo_story.json: Cannot read properties of undefined (reading 'map')

test("test createVideo with nano_banana.json", async () => {
  const script = getMulmoScript("test/nano_banana.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1024:h=1536:force_original_aspect_ratio=decrease,pad=1024:1536:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test.json", async () => {
  const script = getMulmoScript("test/test.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test1.json", async () => {
  const script = getMulmoScript("test/test1.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test2.json", async () => {
  const script = getMulmoScript("test/test2.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_all_tts.json", async () => {
  const script = getMulmoScript("test/test_all_tts.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_audio.json", async () => {
  const script = getMulmoScript("test/test_audio.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11]concat=n=12:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_audio_gemini.json", async () => {
  const script = getMulmoScript("test/test_audio_gemini.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_audio_instructions.json", async () => {
  const script = getMulmoScript("test/test_audio_instructions.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_beats.json", async () => {
  const script = getMulmoScript("test/test_beats.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_captions.json", async () => {
  const script = getMulmoScript("test/test_captions.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_elevenlabs_models.json", async () => {
  const script = getMulmoScript("test/test_elevenlabs_models.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10]concat=n=11:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_en.json", async () => {
  const script = getMulmoScript("test/test_en.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_genai.json", async () => {
  const script = getMulmoScript("test/test_genai.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8]concat=n=9:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_genai_movie.json", async () => {
  const script = getMulmoScript("test/test_genai_movie.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_hello.json", async () => {
  const script = getMulmoScript("test/test_hello.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_hello_caption.json", async () => {
  const script = getMulmoScript("test/test_hello_caption.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_hello_google.json", async () => {
  const script = getMulmoScript("test/test_hello_google.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_hello_image.json", async () => {
  const script = getMulmoScript("test/test_hello_image.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_hello_nobgm.json", async () => {
  const script = getMulmoScript("test/test_hello_nobgm.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_html.json", async () => {
  const script = getMulmoScript("test/test_html.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_image_refs.json", async () => {
  const script = getMulmoScript("test/test_image_refs.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_images.json", async () => {
  const script = getMulmoScript("test/test_images.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_kotodama.json", async () => {
  const script = getMulmoScript("test/test_kotodama.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_lang.json", async () => {
  const script = getMulmoScript("test/test_lang.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_layout.json", async () => {
  const script = getMulmoScript("test/test_layout.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[v0][v1][v2][v3][v4][v5][v6][v7]concat=n=8:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_lipsync.json", async () => {
  const script = getMulmoScript("test/test_lipsync.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_loop.json", async () => {
  const script = getMulmoScript("test/test_loop.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_markdown.json", async () => {
  const script = getMulmoScript("test/test_markdown.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_media.json", async () => {
  const script = getMulmoScript("test/test_media.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[12:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v12]",
    "[13:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v13]",
    "[14:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v14]",
    "[15:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v15]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14][v15]concat=n=16:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_mixed_providers.json", async () => {
  const script = getMulmoScript("test/test_mixed_providers.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_movie.json", async () => {
  const script = getMulmoScript("test/test_movie.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v0][v1]concat=n=2:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_movie2.json", async () => {
  const script = getMulmoScript("test/test_movie2.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_mv.json", async () => {
  const script = getMulmoScript("test/test_mv.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1536:h=1024:force_original_aspect_ratio=decrease,pad=1536:1024:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1536:h=1024:force_original_aspect_ratio=decrease,pad=1536:1024:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1536:h=1024:force_original_aspect_ratio=decrease,pad=1536:1024:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_no_audio.json", async () => {
  const script = getMulmoScript("test/test_no_audio.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11]concat=n=12:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_no_audio_with_credit.json", async () => {
  const script = getMulmoScript("test/test_no_audio_with_credit.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11]concat=n=12:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_order.json", async () => {
  const script = getMulmoScript("test/test_order.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8]concat=n=9:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_order_portrait.json", async () => {
  const script = getMulmoScript("test/test_order_portrait.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=720:h=1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8]concat=n=9:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_replicate.json", async () => {
  const script = getMulmoScript("test/test_replicate.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[12:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v12]",
    "[13:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v13]",
    "[14:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v14]",
    "[15:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v15]",
    "[16:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v16]",
    "[17:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v17]",
    "[18:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v18]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14][v15][v16][v17][v18]concat=n=19:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_size_error.json", async () => {
  const script = getMulmoScript("test/test_size_error.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1024:h=1:force_original_aspect_ratio=decrease,pad=1024:1:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_slideout_left_no_audio.json", async () => {
  const script = getMulmoScript("test/test_slideout_left_no_audio.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_sound_effect.json", async () => {
  const script = getMulmoScript("test/test_sound_effect.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_spillover.json", async () => {
  const script = getMulmoScript("test/test_spillover.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11]concat=n=12:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_transition.json", async () => {
  const script = getMulmoScript("test/test_transition.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_transition2.json", async () => {
  const script = getMulmoScript("test/test_transition2.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);

  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v1]split=2[v1][v1_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v1_last_null]",
    "[v1_last_src]select='eq(n,0)',scale=1280:720[v1_last_frame]",
    "[v1_last_null][v1_last_frame]overlay=format=auto,fps=30[v1_last]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v3]split=2[v3][v3_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v3_last_null]",
    "[v3_last_src]reverse,select='eq(n,0)',reverse,scale=1280:720[v3_last_frame]",
    "[v3_last_null][v3_last_frame]overlay=format=auto,fps=30[v3_last]",
    "[4:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[v4]split=2[v4][v4_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v4_last_null]",
    "[v4_last_src]reverse,select='eq(n,0)',reverse,scale=1280:720[v4_last_frame]",
    "[v4_last_null][v4_last_frame]overlay=format=auto,fps=30[v4_last]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[v5]split=2[v5][v5_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v5_last_null]",
    "[v5_last_src]select='eq(n,0)',scale=1280:720[v5_last_frame]",
    "[v5_last_null][v5_last_frame]overlay=format=auto,fps=30[v5_last]",
    "[6:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v6]",
    "[v6]split=2[v6][v6_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v6_last_null]",
    "[v6_last_src]select='eq(n,0)',scale=1280:720[v6_last_frame]",
    "[v6_last_null][v6_last_frame]overlay=format=auto,fps=30[v6_last]",
    "[7:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v7]",
    "[v7]split=2[v7][v7_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v7_last_null]",
    "[v7_last_src]select='eq(n,0)',scale=1280:720[v7_last_frame]",
    "[v7_last_null][v7_last_frame]overlay=format=auto,fps=30[v7_last]",
    "[8:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v8]",
    "[v8]split=2[v8][v8_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v8_last_null]",
    "[v8_last_src]select='eq(n,0)',scale=1280:720[v8_last_frame]",
    "[v8_last_null][v8_last_frame]overlay=format=auto,fps=30[v8_last]",
    "[9:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v9]",
    "[v9]split=3[v9][v9_first_src][v9_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v9_first_null]",
    "[v9_first_src]select='eq(n,0)',scale=1280:720[v9_first_frame]",
    "[v9_first_null][v9_first_frame]overlay=format=auto,fps=30[v9_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v9_last_null]",
    "[v9_last_src]select='eq(n,0)',scale=1280:720[v9_last_frame]",
    "[v9_last_null][v9_last_frame]overlay=format=auto,fps=30[v9_last]",
    "[10:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v10]",
    "[v10]split=3[v10][v10_first_src][v10_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v10_first_null]",
    "[v10_first_src]select='eq(n,0)',scale=1280:720[v10_first_frame]",
    "[v10_first_null][v10_first_frame]overlay=format=auto,fps=30[v10_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v10_last_null]",
    "[v10_last_src]select='eq(n,0)',scale=1280:720[v10_last_frame]",
    "[v10_last_null][v10_last_frame]overlay=format=auto,fps=30[v10_last]",
    "[11:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v11]",
    "[v11]split=3[v11][v11_first_src][v11_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v11_first_null]",
    "[v11_first_src]select='eq(n,0)',scale=1280:720[v11_first_frame]",
    "[v11_first_null][v11_first_frame]overlay=format=auto,fps=30[v11_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v11_last_null]",
    "[v11_last_src]select='eq(n,0)',scale=1280:720[v11_last_frame]",
    "[v11_last_null][v11_last_frame]overlay=format=auto,fps=30[v11_last]",
    "[12:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v12]",
    "[v12]split=3[v12][v12_first_src][v12_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v12_first_null]",
    "[v12_first_src]select='eq(n,0)',scale=1280:720[v12_first_frame]",
    "[v12_first_null][v12_first_frame]overlay=format=auto,fps=30[v12_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v12_last_null]",
    "[v12_last_src]select='eq(n,0)',scale=1280:720[v12_last_frame]",
    "[v12_last_null][v12_last_frame]overlay=format=auto,fps=30[v12_last]",
    "[13:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v13]",
    "[v13]split=2[v13][v13_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v13_last_null]",
    "[v13_last_src]select='eq(n,0)',scale=1280:720[v13_last_frame]",
    "[v13_last_null][v13_last_frame]overlay=format=auto,fps=30[v13_last]",
    "[14:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v14]",
    "[v14]split=2[v14][v14_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v14_last_null]",
    "[v14_last_src]select='eq(n,0)',scale=1280:720[v14_last_frame]",
    "[v14_last_null][v14_last_frame]overlay=format=auto,fps=30[v14_last]",
    "[15:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v15]",
    "[v15]split=3[v15][v15_first_src][v15_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v15_first_null]",
    "[v15_first_src]select='eq(n,0)',scale=1280:720[v15_first_frame]",
    "[v15_first_null][v15_first_frame]overlay=format=auto,fps=30[v15_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v15_last_null]",
    "[v15_last_src]select='eq(n,0)',scale=1280:720[v15_last_frame]",
    "[v15_last_null][v15_last_frame]overlay=format=auto,fps=30[v15_last]",
    "[16:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v16]",
    "[v16]split=3[v16][v16_first_src][v16_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v16_first_null]",
    "[v16_first_src]select='eq(n,0)',scale=1280:720[v16_first_frame]",
    "[v16_first_null][v16_first_frame]overlay=format=auto,fps=30[v16_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v16_last_null]",
    "[v16_last_src]select='eq(n,0)',scale=1280:720[v16_last_frame]",
    "[v16_last_null][v16_last_frame]overlay=format=auto,fps=30[v16_last]",
    "[17:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v17]",
    "[v17]split=3[v17][v17_first_src][v17_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v17_first_null]",
    "[v17_first_src]select='eq(n,0)',scale=1280:720[v17_first_frame]",
    "[v17_first_null][v17_first_frame]overlay=format=auto,fps=30[v17_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v17_last_null]",
    "[v17_last_src]select='eq(n,0)',scale=1280:720[v17_last_frame]",
    "[v17_last_null][v17_last_frame]overlay=format=auto,fps=30[v17_last]",
    "[18:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v18]",
    "[v18]split=3[v18][v18_first_src][v18_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v18_first_null]",
    "[v18_first_src]select='eq(n,0)',scale=1280:720[v18_first_frame]",
    "[v18_first_null][v18_first_frame]overlay=format=auto,fps=30[v18_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v18_last_null]",
    "[v18_last_src]select='eq(n,0)',scale=1280:720[v18_last_frame]",
    "[v18_last_null][v18_last_frame]overlay=format=auto,fps=30[v18_last]",
    "[19:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v19]",
    "[v19]split=3[v19][v19_first_src][v19_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v19_first_null]",
    "[v19_first_src]select='eq(n,0)',scale=1280:720[v19_first_frame]",
    "[v19_first_null][v19_first_frame]overlay=format=auto,fps=30[v19_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v19_last_null]",
    "[v19_last_src]select='eq(n,0)',scale=1280:720[v19_last_frame]",
    "[v19_last_null][v19_last_frame]overlay=format=auto,fps=30[v19_last]",
    "[20:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v20]",
    "[v20]split=3[v20][v20_first_src][v20_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v20_first_null]",
    "[v20_first_src]select='eq(n,0)',scale=1280:720[v20_first_frame]",
    "[v20_first_null][v20_first_frame]overlay=format=auto,fps=30[v20_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v20_last_null]",
    "[v20_last_src]select='eq(n,0)',scale=1280:720[v20_last_frame]",
    "[v20_last_null][v20_last_frame]overlay=format=auto,fps=30[v20_last]",
    "[21:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v21]",
    "[v21]split=3[v21][v21_first_src][v21_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v21_first_null]",
    "[v21_first_src]select='eq(n,0)',scale=1280:720[v21_first_frame]",
    "[v21_first_null][v21_first_frame]overlay=format=auto,fps=30[v21_first]",
    "nullsrc=size=1280x720:duration=1:rate=30[v21_last_null]",
    "[v21_last_src]select='eq(n,0)',scale=1280:720[v21_last_frame]",
    "[v21_last_null][v21_last_frame]overlay=format=auto,fps=30[v21_last]",
    "[22:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v22]",
    "[v22]split=2[v22][v22_first_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v22_first_null]",
    "[v22_first_src]select='eq(n,0)',scale=1280:720[v22_first_frame]",
    "[v22_first_null][v22_first_frame]overlay=format=auto,fps=30[v22_first]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14][v15][v16][v17][v18][v19][v20][v21][v22]concat=n=23:v=1:a=0[concat_video]",
    "[v1_last]format=yuva420p,setpts=PTS-STARTPTS+9.95/TB[v1_last_f]",
    "[concat_video][v1_last_f]overlay=x='-(t-9.95)*W/1':y=0:enable='between(t,9.95,10.95)'[trans_2_o]",
    "[v3_last]format=yuva420p,setpts=PTS-STARTPTS+19.95/TB[v3_last_f]",
    "[trans_2_o][v3_last_f]overlay=x='-(t-19.95)*W/1':y=0:enable='between(t,19.95,20.95)'[trans_4_o]",
    "[v4_last]format=yuva420p,setpts=PTS-STARTPTS+24.95/TB[v4_last_f]",
    "[trans_4_o][v4_last_f]overlay=x='-(t-24.95)*W/1':y=0:enable='between(t,24.95,25.95)'[trans_5_o]",
    "[v5_last]format=yuva420p,setpts=PTS-STARTPTS+29.95/TB[v5_last_f]",
    "[trans_5_o][v5_last_f]overlay=x='(t-29.95)*W/1':y=0:enable='between(t,29.95,30.95)'[trans_6_o]",
    "[v6_last]format=yuva420p,setpts=PTS-STARTPTS+34.95/TB[v6_last_f]",
    "[trans_6_o][v6_last_f]overlay=x=0:y='-(t-34.95)*H/1':enable='between(t,34.95,35.95)'[trans_7_o]",
    "[v7_last]format=yuva420p,setpts=PTS-STARTPTS+39.95/TB[v7_last_f]",
    "[trans_7_o][v7_last_f]overlay=x=0:y='(t-39.95)*H/1':enable='between(t,39.95,40.95)'[trans_8_o]",
    "[v8_last]format=yuva420p,setpts=PTS-STARTPTS+44.95/TB[v8_last_bg]",
    "[v9_first]format=yuva420p,setpts=PTS-STARTPTS+44.95/TB[v9_first_f]",
    "[trans_8_o][v8_last_bg]overlay=enable='between(t,44.95,45.95)'[v8_last_bg_o]",
    "[v8_last_bg_o][v9_first_f]overlay=x='-W+(t-44.95)*W/1':y=0:enable='between(t,44.95,45.95)'[trans_9_o]",
    "[v9_last]format=yuva420p,setpts=PTS-STARTPTS+49.95/TB[v9_last_bg]",
    "[v10_first]format=yuva420p,setpts=PTS-STARTPTS+49.95/TB[v10_first_f]",
    "[trans_9_o][v9_last_bg]overlay=enable='between(t,49.95,50.95)'[v9_last_bg_o]",
    "[v9_last_bg_o][v10_first_f]overlay=x='W-(t-49.95)*W/1':y=0:enable='between(t,49.95,50.95)'[trans_10_o]",
    "[v10_last]format=yuva420p,setpts=PTS-STARTPTS+54.95/TB[v10_last_bg]",
    "[v11_first]format=yuva420p,setpts=PTS-STARTPTS+54.95/TB[v11_first_f]",
    "[trans_10_o][v10_last_bg]overlay=enable='between(t,54.95,55.95)'[v10_last_bg_o]",
    "[v10_last_bg_o][v11_first_f]overlay=x=0:y='H-(t-54.95)*H/1':enable='between(t,54.95,55.95)'[trans_11_o]",
    "[v11_last]format=yuva420p,setpts=PTS-STARTPTS+59.95/TB[v11_last_bg]",
    "[v12_first]format=yuva420p,setpts=PTS-STARTPTS+59.95/TB[v12_first_f]",
    "[trans_11_o][v11_last_bg]overlay=enable='between(t,59.95,60.95)'[v11_last_bg_o]",
    "[v11_last_bg_o][v12_first_f]overlay=x=0:y='-H+(t-59.95)*H/1':enable='between(t,59.95,60.95)'[trans_12_o]",
    "[v12_last]format=yuva420p,fade=t=out:d=1:alpha=1,setpts=PTS-STARTPTS+64.95/TB[v12_last_f]",
    "[trans_12_o][v12_last_f]overlay=enable='between(t,64.95,65.95)'[trans_13_o]",
    "[v13_last]format=yuva420p,fade=t=out:d=1:alpha=1,setpts=PTS-STARTPTS+69.95/TB[v13_last_f]",
    "[trans_13_o][v13_last_f]overlay=enable='between(t,69.95,70.95)'[trans_14_o]",
    "[v14_last]format=yuv420p[v14_last_fmt]",
    "[v15_first]format=yuv420p[v15_first_fmt]",
    "[v14_last_fmt][v15_first_fmt]xfade=transition=wipeleft:duration=1:offset=0[v14_last_xfade]",
    "[v14_last_xfade]setpts=PTS-STARTPTS+74.95/TB[v14_last_xfade_t]",
    "[trans_14_o][v14_last_xfade_t]overlay=enable='between(t,74.95,75.95)'[trans_15_o]",
    "[v15_last]format=yuv420p[v15_last_fmt]",
    "[v16_first]format=yuv420p[v16_first_fmt]",
    "[v15_last_fmt][v16_first_fmt]xfade=transition=wiperight:duration=1:offset=0[v15_last_xfade]",
    "[v15_last_xfade]setpts=PTS-STARTPTS+79.95/TB[v15_last_xfade_t]",
    "[trans_15_o][v15_last_xfade_t]overlay=enable='between(t,79.95,80.95)'[trans_16_o]",
    "[v16_last]format=yuv420p[v16_last_fmt]",
    "[v17_first]format=yuv420p[v17_first_fmt]",
    "[v16_last_fmt][v17_first_fmt]xfade=transition=wipeup:duration=1:offset=0[v16_last_xfade]",
    "[v16_last_xfade]setpts=PTS-STARTPTS+84.95/TB[v16_last_xfade_t]",
    "[trans_16_o][v16_last_xfade_t]overlay=enable='between(t,84.95,85.95)'[trans_17_o]",
    "[v17_last]format=yuv420p[v17_last_fmt]",
    "[v18_first]format=yuv420p[v18_first_fmt]",
    "[v17_last_fmt][v18_first_fmt]xfade=transition=wipedown:duration=1:offset=0[v17_last_xfade]",
    "[v17_last_xfade]setpts=PTS-STARTPTS+89.95/TB[v17_last_xfade_t]",
    "[trans_17_o][v17_last_xfade_t]overlay=enable='between(t,89.95,90.95)'[trans_18_o]",
    "[v18_last]format=yuv420p[v18_last_fmt]",
    "[v19_first]format=yuv420p[v19_first_fmt]",
    "[v18_last_fmt][v19_first_fmt]xfade=transition=wipetl:duration=1:offset=0[v18_last_xfade]",
    "[v18_last_xfade]setpts=PTS-STARTPTS+94.95/TB[v18_last_xfade_t]",
    "[trans_18_o][v18_last_xfade_t]overlay=enable='between(t,94.95,95.95)'[trans_19_o]",
    "[v19_last]format=yuv420p[v19_last_fmt]",
    "[v20_first]format=yuv420p[v20_first_fmt]",
    "[v19_last_fmt][v20_first_fmt]xfade=transition=wipetr:duration=1:offset=0[v19_last_xfade]",
    "[v19_last_xfade]setpts=PTS-STARTPTS+99.95/TB[v19_last_xfade_t]",
    "[trans_19_o][v19_last_xfade_t]overlay=enable='between(t,99.95,100.95)'[trans_20_o]",
    "[v20_last]format=yuv420p[v20_last_fmt]",
    "[v21_first]format=yuv420p[v21_first_fmt]",
    "[v20_last_fmt][v21_first_fmt]xfade=transition=wipebl:duration=1:offset=0[v20_last_xfade]",
    "[v20_last_xfade]setpts=PTS-STARTPTS+104.95/TB[v20_last_xfade_t]",
    "[trans_20_o][v20_last_xfade_t]overlay=enable='between(t,104.95,105.95)'[trans_21_o]",
    "[v21_last]format=yuv420p[v21_last_fmt]",
    "[v22_first]format=yuv420p[v22_first_fmt]",
    "[v21_last_fmt][v22_first_fmt]xfade=transition=wipebr:duration=1:offset=0[v21_last_xfade]",
    "[v21_last_xfade]setpts=PTS-STARTPTS+109.95/TB[v21_last_xfade_t]",
    "[trans_21_o][v21_last_xfade_t]overlay=enable='between(t,109.95,110.95)'[trans_22_o]",
  ]);
});

test("test createVideo with test_transition3.json", async () => {
  const script = getMulmoScript("test/test_transition3.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v1]split=2[v1][v1_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v1_last_null]",
    "[v1_last_src]select='eq(n,0)',scale=1280:720[v1_last_frame]",
    "[v1_last_null][v1_last_frame]overlay=format=auto,fps=30[v1_last]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v2]split=2[v2][v2_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v2_last_null]",
    "[v2_last_src]select='eq(n,0)',scale=1280:720[v2_last_frame]",
    "[v2_last_null][v2_last_frame]overlay=format=auto,fps=30[v2_last]",
    "[3:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[concat_video]",
    "[v1_last]format=yuva420p,setpts=PTS-STARTPTS+9.95/TB[v1_last_f]",
    "[concat_video][v1_last_f]overlay=x='-(t-9.95)*W/1':y=0:enable='between(t,9.95,10.95)'[trans_2_o]",
    "[v2_last]format=yuva420p,setpts=PTS-STARTPTS+14.95/TB[v2_last_f]",
    "[trans_2_o][v2_last_f]overlay=x='-(t-14.95)*W/1':y=0:enable='between(t,14.95,15.95)'[trans_3_o]",
  ]);
});

test("test createVideo with test_transition_no_audio.json", async () => {
  const script = getMulmoScript("test/test_transition_no_audio.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[v1]split=2[v1][v1_last_src]",
    "nullsrc=size=1280x720:duration=1:rate=30[v1_last_null]",
    "[v1_last_src]select='eq(n,0)',scale=1280:720[v1_last_frame]",
    "[v1_last_null][v1_last_frame]overlay=format=auto,fps=30[v1_last]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]",
    "[v1_last]format=yuva420p,setpts=PTS-STARTPTS+9.95/TB[v1_last_f]",
    "[concat_video][v1_last_f]overlay=x='-(t-9.95)*W/1':y=0:enable='between(t,9.95,10.95)'[trans_2_o]",
  ]);
});

test("test createVideo with test_video_speed.json", async () => {
  const script = getMulmoScript("test/test_video_speed.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]tpad=stop_mode=clone:stop_duration=20,trim=duration=10,fps=30,setpts=0.5*PTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[3:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
    "[4:v]tpad=stop_mode=clone:stop_duration=5,trim=duration=2.5,fps=30,setpts=2*PTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
    "[5:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
    "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_vision.json", async () => {
  const script = getMulmoScript("test/test_vision.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[v0]concat=n=1:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_voice_over.json", async () => {
  const script = getMulmoScript("test/test_voice_over.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_voices.json", async () => {
  const script = getMulmoScript("test/test_voices.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
    "[2:v]loop=loop=-1:size=1:start=0,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v2]",
    "[v0][v1][v2]concat=n=3:v=1:a=0[concat_video]",
  ]);
});

test("test createVideo with test_video_filters.json", async () => {
  const script = getMulmoScript("test/test_video_filters.json");
  const context = createContextFromScript(script);
  const result = await createVideo("/dummy/audio.mp3", "/dummy/output.mp4", context, true);
  assert.deepStrictEqual(result, [
    "[0:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v0]",
    "[1:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,hue=s=0[v1]",
    "[2:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131[v2]",
    "[3:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,eq=brightness=0.5:contrast=1.3[v3]",
    "[4:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,boxblur=10:1[v4]",
    "[5:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,gblur=sigma=30[v5]",
    "[6:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,noise=alls=40:allf=t+u[v6]",
    "[7:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,tblend=all_mode=difference,noise=alls=40[v7]",
    "[8:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,noise=alls=50:allf=t[v8]",
    "[9:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,eq=brightness=0:contrast=1.2,noise=alls=20:allf=t[v9]",
    "[10:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,hflip[v10]",
    "[11:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,hue=h=120:s=1.8:b=0[v11]",
    "[12:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,vibrance=intensity=1.8[v12]",
    "[13:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,negate[v13]",
    "[14:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=3:chroma_msize_x=5:chroma_msize_y=5:chroma_amount=0[v14]",
    "[15:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,edgedetect=low=0.2:high=0.4:mode=wires[v15]",
    "[16:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,sobel=planes=15:scale=1:delta=0[v16]",
    "[17:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,convolution='0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0'[v17]",
    "[18:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,vflip[v18]",
    "[19:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,vignette=angle=0.6283185307179586:mode=forward[v19]",
    "[20:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,scale=iw/20:ih/20,scale=20*iw:20*ih:flags=neighbor[v20]",
    "[21:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,pseudocolor=preset=magma[v21]",
    "[22:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,pseudocolor=preset=viridis[v22]",
    "[23:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,elbg=l=16[v23]",
    "[24:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,chromashift=cbh=5:cbv=0:crh=-5:crv=0:edge=smear[v24]",
    "[25:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=5,fps=30,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,lagfun=decay=0.85:planes=15[v25]",
    "[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14][v15][v16][v17][v18][v19][v20][v21][v22][v23][v24][v25]concat=n=26:v=1:a=0[concat_video]",
  ]);
});
