import test from "node:test";
import assert from "node:assert";

import {
  getVideoPart,
  getAudioPart,
  getOutOverlayCoords,
  getInOverlayCoords,
  getNeedFirstFrame,
  getNeedLastFrame,
  getExtraPadding,
  getFillOption,
  getTransitionVideoId,
  getConcatVideoFilter,
  addSplitAndExtractFrames,
  getTransitionFrameDurations,
} from "../../src/actions/movie.js";
import { FfmpegContextInit } from "../../src/utils/ffmpeg_utils.js";
import type { MulmoStudioContext, MulmoBeat, MulmoPresentationStyle, MulmoStudioBeat } from "../../src/types/index.js";

// Test helper types for partial context objects
type TestContextForFrameCheck = {
  studio: {
    script: {
      beats: Partial<MulmoBeat>[];
    };
  };
  presentationStyle: Partial<MulmoPresentationStyle>;
};

type TestContextForPadding = {
  presentationStyle: {
    audioParams: {
      introPadding: number;
      outroPadding: number;
    };
  };
  studio: {
    script: {
      beats: Partial<MulmoBeat>[];
    };
    beats: Partial<MulmoStudioBeat>[];
  };
};

type TestContextForFillOption = {
  presentationStyle: Partial<MulmoPresentationStyle>;
};

type TestContextForTransitionDurations = {
  studio: {
    script: {
      beats: Partial<MulmoBeat>[];
    };
    beats: Partial<MulmoStudioBeat>[];
  };
  presentationStyle: Partial<MulmoPresentationStyle>;
};

test("test getVideoParts image", async () => {
  const { videoPart } = getVideoPart(1, false, 200, { width: 100, height: 300 }, { style: "aspectFit" }, 1.0);
  assert.equal(
    videoPart,
    "[1:v]loop=loop=-1:size=1:start=0,fps=30,trim=duration=200,setpts=PTS-STARTPTS,scale=w=100:h=300:force_original_aspect_ratio=decrease,pad=100:300:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
  );
});

test("test getVideoParts movie", async () => {
  const { videoPart } = getVideoPart(1, true, 200, { width: 100, height: 300 }, { style: "aspectFit" }, 1.0);
  assert.equal(
    videoPart,
    "[1:v]tpad=stop_mode=clone:stop_duration=400,fps=30,trim=duration=200,setpts=PTS-STARTPTS,scale=w=100:h=300:force_original_aspect_ratio=decrease,pad=100:300:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
  );
});

test("test getVideoParts aspectFill", async () => {
  const { videoPart } = getVideoPart(2, false, 150, { width: 1280, height: 720 }, { style: "aspectFill" }, 1.0);
  assert.equal(
    videoPart,
    "[2:v]loop=loop=-1:size=1:start=0,fps=30,trim=duration=150,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p[v2]",
  );
});

test("test getVideoParts with speed", async () => {
  const { videoPart } = getVideoPart(3, true, 100, { width: 1920, height: 1080 }, { style: "aspectFit" }, 2.0);
  assert.equal(
    videoPart,
    "[3:v]tpad=stop_mode=clone:stop_duration=400,fps=30,trim=duration=200,setpts=0.5*PTS,scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v3]",
  );
});

test("test getVideoParts with frameCount", async () => {
  const { videoPart } = getVideoPart(4, false, 5, { width: 1280, height: 720 }, { style: "aspectFit" }, 1.0, undefined, 150);
  assert.equal(
    videoPart,
    "[4:v]loop=loop=-1:size=1:start=0,fps=30,trim=end_frame=150,setpts=PTS-STARTPTS,scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v4]",
  );
});

test("test getVideoParts with frameCount and speed", async () => {
  const { videoPart } = getVideoPart(5, true, 5, { width: 1920, height: 1080 }, { style: "aspectFit" }, 2.0, undefined, 150);
  assert.equal(
    videoPart,
    "[5:v]tpad=stop_mode=clone:stop_duration=20,fps=30,trim=end_frame=300,setpts=0.5*PTS,scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v5]",
  );
});

test("test getAudioPart movie", async () => {
  const { audioPart } = getAudioPart(1, 100, 100, 0.2);
  assert.equal(audioPart, "[1:a]atrim=duration=100,adelay=100000|100000,volume=0.2,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1]");
});

test("test getAudioPart with different parameters", async () => {
  const { audioPart } = getAudioPart(5, 200, 50, 1.0);
  assert.equal(audioPart, "[5:a]atrim=duration=200,adelay=50000|50000,volume=1,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a5]");
});

test("test getAudioPart with zero delay", async () => {
  const { audioPart } = getAudioPart(10, 300, 0, 0.5);
  assert.equal(audioPart, "[10:a]atrim=duration=300,adelay=0|0,volume=0.5,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a10]");
});

// getOutOverlayCoords tests
test("test getOutOverlayCoords slideout_left", async () => {
  const coords = getOutOverlayCoords("slideout_left", 1.0, 2.0);
  assert.equal(coords, "x='-(t-2)*W/1':y=0");
});

test("test getOutOverlayCoords slideout_right", async () => {
  const coords = getOutOverlayCoords("slideout_right", 1.5, 3.0);
  assert.equal(coords, "x='(t-3)*W/1.5':y=0");
});

test("test getOutOverlayCoords slideout_up", async () => {
  const coords = getOutOverlayCoords("slideout_up", 2.0, 1.0);
  assert.equal(coords, "x=0:y='-(t-1)*H/2'");
});

test("test getOutOverlayCoords slideout_down", async () => {
  const coords = getOutOverlayCoords("slideout_down", 0.5, 4.5);
  assert.equal(coords, "x=0:y='(t-4.5)*H/0.5'");
});

test("test getOutOverlayCoords invalid type", async () => {
  assert.throws(() => {
    getOutOverlayCoords("invalid_type", 1.0, 0);
  }, /Unknown transition type/);
});

// getInOverlayCoords tests
test("test getInOverlayCoords slidein_left", async () => {
  const coords = getInOverlayCoords("slidein_left", 1.0, 2.0);
  assert.equal(coords, "x='-W+(t-2)*W/1':y=0");
});

test("test getInOverlayCoords slidein_right", async () => {
  const coords = getInOverlayCoords("slidein_right", 1.5, 3.0);
  assert.equal(coords, "x='W-(t-3)*W/1.5':y=0");
});

test("test getInOverlayCoords slidein_up", async () => {
  const coords = getInOverlayCoords("slidein_up", 2.0, 1.0);
  assert.equal(coords, "x=0:y='H-(t-1)*H/2'");
});

test("test getInOverlayCoords slidein_down", async () => {
  const coords = getInOverlayCoords("slidein_down", 0.5, 4.5);
  assert.equal(coords, "x=0:y='-H+(t-4.5)*H/0.5'");
});

test("test getInOverlayCoords invalid type", async () => {
  assert.throws(() => {
    getInOverlayCoords("invalid_type", 1.0, 0);
  }, /Unknown transition type/);
});

// getNeedFirstFrame tests
test("test getNeedFirstFrame with slidein transitions", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [
          { speaker: "A" },
          { speaker: "B", movieParams: { transition: { type: "slidein_left", duration: 1.0 } } },
          { speaker: "C", movieParams: { transition: { type: "slidein_right", duration: 1.0 } } },
          { speaker: "D", movieParams: { transition: { type: "fade", duration: 1.0 } } },
        ],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedFirstFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [false, true, true, false]);
});

test("test getNeedFirstFrame with no transitions", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedFirstFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [false, false, false]);
});

test("test getNeedFirstFrame first beat cannot have transition", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [{ speaker: "A", movieParams: { transition: { type: "slidein_left", duration: 1.0 } } }, { speaker: "B" }],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedFirstFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [false, false]);
});

// getNeedLastFrame tests
test("test getNeedLastFrame with transitions on next beats", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [
          { speaker: "A" },
          { speaker: "B", movieParams: { transition: { type: "fade", duration: 1.0 } } },
          { speaker: "C", movieParams: { transition: { type: "slideout_left", duration: 1.0 } } },
          { speaker: "D" },
        ],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedLastFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [true, true, false, false]);
});

test("test getNeedLastFrame with no transitions", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedLastFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [false, false, false]);
});

test("test getNeedLastFrame last beat never needs last frame", async () => {
  const context: TestContextForFrameCheck = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B", movieParams: { transition: { type: "fade", duration: 1.0 } } }],
      },
    },
    presentationStyle: {},
  };

  const result = getNeedLastFrame(context as MulmoStudioContext);
  assert.deepEqual(result, [true, false]);
});

// getExtraPadding tests
test("test getExtraPadding for first beat", async () => {
  const context: TestContextForPadding = {
    presentationStyle: {
      audioParams: {
        introPadding: 2.0,
        outroPadding: 3.0,
      },
    },
    studio: {
      script: {
        beats: [{}, {}, {}],
      },
      beats: [{}, {}, {}],
    },
  };

  const result = getExtraPadding(context as MulmoStudioContext, 0);
  assert.equal(result, 2.0);
});

test("test getExtraPadding for last beat", async () => {
  const context: TestContextForPadding = {
    presentationStyle: {
      audioParams: {
        introPadding: 2.0,
        outroPadding: 3.0,
      },
    },
    studio: {
      script: {
        beats: [{}, {}, {}],
      },
      beats: [{}, {}, {}],
    },
  };

  const result = getExtraPadding(context as MulmoStudioContext, 2);
  assert.equal(result, 3.0);
});

test("test getExtraPadding for middle beat", async () => {
  const context: TestContextForPadding = {
    presentationStyle: {
      audioParams: {
        introPadding: 2.0,
        outroPadding: 3.0,
      },
    },
    studio: {
      script: {
        beats: [{}, {}, {}],
      },
      beats: [{}, {}, {}],
    },
  };

  const result = getExtraPadding(context as MulmoStudioContext, 1);
  assert.equal(result, 0);
});

// getFillOption tests
test("test getFillOption with defaults only", async () => {
  const context: TestContextForFillOption = {
    presentationStyle: {},
  };
  const beat: MulmoBeat = { speaker: "A" };

  const result = getFillOption(context as MulmoStudioContext, beat);
  assert.equal(result.style, "aspectFit");
});

test("test getFillOption with global setting", async () => {
  const context: TestContextForFillOption = {
    presentationStyle: {
      movieParams: {
        fillOption: { style: "aspectFill" },
      },
    },
  };
  const beat: MulmoBeat = { speaker: "A" };

  const result = getFillOption(context as MulmoStudioContext, beat);
  assert.equal(result.style, "aspectFill");
});

test("test getFillOption with beat override", async () => {
  const context: TestContextForFillOption = {
    presentationStyle: {
      movieParams: {
        fillOption: { style: "aspectFill" },
      },
    },
  };
  const beat: MulmoBeat = {
    speaker: "A",
    movieParams: {
      fillOption: { style: "aspectFit" },
    },
  };

  const result = getFillOption(context as MulmoStudioContext, beat);
  assert.equal(result.style, "aspectFit");
});

// getTransitionVideoId tests
test("test getTransitionVideoId for fade transition", async () => {
  const transition = { type: "fade" as const, duration: 1.0 };
  const videoIdsForBeats = ["v0", "v1", "v2"];

  const result = getTransitionVideoId(transition, videoIdsForBeats, 1);
  assert.deepEqual(result, { videoId: "v0_last", nextVideoId: undefined, beatIndex: 1 });
});

test("test getTransitionVideoId for slideout transition", async () => {
  const transition = { type: "slideout_left" as const, duration: 1.0 };
  const videoIdsForBeats = ["v0", "v1", "v2"];

  const result = getTransitionVideoId(transition, videoIdsForBeats, 2);
  assert.deepEqual(result, { videoId: "v1_last", nextVideoId: undefined, beatIndex: 2 });
});

test("test getTransitionVideoId for slidein transition", async () => {
  const transition = { type: "slidein_right" as const, duration: 1.0 };
  const videoIdsForBeats = ["v0", "v1", "v2"];

  const result = getTransitionVideoId(transition, videoIdsForBeats, 1);
  assert.deepEqual(result, { videoId: "", nextVideoId: "v1_first", beatIndex: 1 });
});

// getTransitionFrameDurations tests
test("test getTransitionFrameDurations clamps to 90 percent of adjacent beats", async () => {
  const context: TestContextForTransitionDurations = {
    studio: {
      script: {
        beats: [
          { speaker: "A" },
          { speaker: "B", movieParams: { transition: { type: "fade", duration: 2.0 } } },
          { speaker: "C", movieParams: { transition: { type: "fade", duration: 2.0 } } },
        ],
      },
      beats: [{ duration: 2.0 }, { duration: 4.0 }, { duration: 10.0 }],
    },
    presentationStyle: {},
  };

  const result = getTransitionFrameDurations(context as MulmoStudioContext, 1);
  assert.equal(result.firstDuration, 1.8);
  assert.equal(result.lastDuration, 2.0);
});

test("test getTransitionFrameDurations enforces min frame", async () => {
  const context: TestContextForTransitionDurations = {
    studio: {
      script: {
        beats: [
          { speaker: "A" },
          { speaker: "B", movieParams: { transition: { type: "fade", duration: 0.01 } } },
          { speaker: "C", movieParams: { transition: { type: "fade", duration: 0.01 } } },
        ],
      },
      beats: [{ duration: 1.0 }, { duration: 1.0 }, { duration: 1.0 }],
    },
    presentationStyle: {},
  };

  const result = getTransitionFrameDurations(context as MulmoStudioContext, 1);
  const minFrame = 1 / 30;
  assert.ok(Math.abs(result.firstDuration - minFrame) < 1e-6);
  assert.ok(Math.abs(result.lastDuration - minFrame) < 1e-6);
});

test("test getTransitionFrameDurations defaults missing durations and handles first beat", async () => {
  const context: TestContextForTransitionDurations = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B", movieParams: { transition: { type: "fade", duration: 2.0 } } }],
      },
      beats: [{}, {}],
    },
    presentationStyle: {},
  };

  const result = getTransitionFrameDurations(context as MulmoStudioContext, 0);
  assert.ok(Math.abs(result.firstDuration - 1 / 30) < 1e-6);
  assert.equal(result.lastDuration, 0.9);
});

test("test getTransitionFrameDurations handles last beat with transition and null next transition", async () => {
  const context: TestContextForTransitionDurations = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B" }, { speaker: "C", movieParams: { transition: { type: "fade", duration: 2.0 } } }],
      },
      beats: [{ duration: 2.0 }, { duration: 2.0 }, { duration: 2.0 }],
    },
    presentationStyle: {},
  };

  const result = getTransitionFrameDurations(context as MulmoStudioContext, 2);
  const minFrame = 1 / 30;
  assert.equal(result.firstDuration, 1.8);
  assert.ok(Math.abs(result.lastDuration - minFrame) < 1e-6);
});

test("test getTransitionFrameDurations handles null transitions", async () => {
  const context: TestContextForTransitionDurations = {
    studio: {
      script: {
        beats: [{ speaker: "A" }, { speaker: "B" }, { speaker: "C" }],
      },
      beats: [{ duration: 2.0 }, { duration: 2.0 }, { duration: 2.0 }],
    },
    presentationStyle: {},
  };

  const result = getTransitionFrameDurations(context as MulmoStudioContext, 1);
  const minFrame = 1 / 30;
  assert.ok(Math.abs(result.firstDuration - minFrame) < 1e-6);
  assert.ok(Math.abs(result.lastDuration - minFrame) < 1e-6);
});

// getConcatVideoFilter tests
test("test getConcatVideoFilter with multiple videos", async () => {
  const videoIds = ["v0", "v1", "v2", "v3"];
  const result = getConcatVideoFilter("concat_video", videoIds);
  assert.equal(result, "[v0][v1][v2][v3]concat=n=4:v=1:a=0[concat_video]");
});

test("test getConcatVideoFilter with single video", async () => {
  const videoIds = ["v0"];
  const result = getConcatVideoFilter("output", videoIds);
  assert.equal(result, "[v0]concat=n=1:v=1:a=0[output]");
});

test("test getConcatVideoFilter filtering undefined", async () => {
  const videoIds = ["v0", undefined, "v2", "v3"];
  const result = getConcatVideoFilter("concat_video", videoIds);
  assert.equal(result, "[v0][v2][v3]concat=n=3:v=1:a=0[concat_video]");
});

// addSplitAndExtractFrames tests
test("test addSplitAndExtractFrames with needFirst only", async () => {
  const ffmpegContext = FfmpegContextInit();
  addSplitAndExtractFrames(ffmpegContext, "v1", 100, 0, false, true, false, { width: 1280, height: 720 });

  assert.equal(ffmpegContext.filterComplex.length, 4);
  assert.equal(ffmpegContext.filterComplex[0], "[v1]split=2[v1][v1_first_src]");
  assert.equal(ffmpegContext.filterComplex[1], "nullsrc=size=1280x720:duration=100:rate=30[v1_first_null]");
  assert.equal(ffmpegContext.filterComplex[2], "[v1_first_src]select='eq(n,0)',scale=1280:720[v1_first_frame]");
  assert.equal(ffmpegContext.filterComplex[3], "[v1_first_null][v1_first_frame]overlay=format=auto,fps=30[v1_first]");
});

test("test addSplitAndExtractFrames with needLast only for image", async () => {
  const ffmpegContext = FfmpegContextInit();
  addSplitAndExtractFrames(ffmpegContext, "v2", 0, 150, false, false, true, { width: 1280, height: 720 });

  assert.equal(ffmpegContext.filterComplex.length, 4);
  assert.equal(ffmpegContext.filterComplex[0], "[v2]split=2[v2][v2_last_src]");
  assert.equal(ffmpegContext.filterComplex[1], "nullsrc=size=1280x720:duration=150:rate=30[v2_last_null]");
  assert.equal(ffmpegContext.filterComplex[2], "[v2_last_src]select='eq(n,0)',scale=1280:720[v2_last_frame]");
  assert.equal(ffmpegContext.filterComplex[3], "[v2_last_null][v2_last_frame]overlay=format=auto,fps=30[v2_last]");
});

test("test addSplitAndExtractFrames with needLast only for movie", async () => {
  const ffmpegContext = FfmpegContextInit();
  addSplitAndExtractFrames(ffmpegContext, "v3", 0, 200, true, false, true, { width: 1280, height: 720 });

  assert.equal(ffmpegContext.filterComplex.length, 4);
  assert.equal(ffmpegContext.filterComplex[0], "[v3]split=2[v3][v3_last_src]");
  assert.equal(ffmpegContext.filterComplex[1], "nullsrc=size=1280x720:duration=200:rate=30[v3_last_null]");
  assert.equal(ffmpegContext.filterComplex[2], "[v3_last_src]reverse,select='eq(n,0)',reverse,scale=1280:720[v3_last_frame]");
  assert.equal(ffmpegContext.filterComplex[3], "[v3_last_null][v3_last_frame]overlay=format=auto,fps=30[v3_last]");
});

test("test addSplitAndExtractFrames with both needFirst and needLast", async () => {
  const ffmpegContext = FfmpegContextInit();
  addSplitAndExtractFrames(ffmpegContext, "v4", 120, 120, false, true, true, { width: 1280, height: 720 });

  assert.equal(ffmpegContext.filterComplex.length, 7);
  assert.equal(ffmpegContext.filterComplex[0], "[v4]split=3[v4][v4_first_src][v4_last_src]");
  assert.equal(ffmpegContext.filterComplex[1], "nullsrc=size=1280x720:duration=120:rate=30[v4_first_null]");
  assert.equal(ffmpegContext.filterComplex[2], "[v4_first_src]select='eq(n,0)',scale=1280:720[v4_first_frame]");
  assert.equal(ffmpegContext.filterComplex[3], "[v4_first_null][v4_first_frame]overlay=format=auto,fps=30[v4_first]");
  assert.equal(ffmpegContext.filterComplex[4], "nullsrc=size=1280x720:duration=120:rate=30[v4_last_null]");
  assert.equal(ffmpegContext.filterComplex[5], "[v4_last_src]select='eq(n,0)',scale=1280:720[v4_last_frame]");
  assert.equal(ffmpegContext.filterComplex[6], "[v4_last_null][v4_last_frame]overlay=format=auto,fps=30[v4_last]");
});

test("test addSplitAndExtractFrames with both for movie", async () => {
  const ffmpegContext = FfmpegContextInit();
  addSplitAndExtractFrames(ffmpegContext, "v5", 180, 180, true, true, true, { width: 1280, height: 720 });

  assert.equal(ffmpegContext.filterComplex.length, 7);
  assert.equal(ffmpegContext.filterComplex[0], "[v5]split=3[v5][v5_first_src][v5_last_src]");
  assert.equal(ffmpegContext.filterComplex[1], "nullsrc=size=1280x720:duration=180:rate=30[v5_first_null]");
  assert.equal(ffmpegContext.filterComplex[2], "[v5_first_src]select='eq(n,0)',scale=1280:720[v5_first_frame]");
  assert.equal(ffmpegContext.filterComplex[3], "[v5_first_null][v5_first_frame]overlay=format=auto,fps=30[v5_first]");
  assert.equal(ffmpegContext.filterComplex[4], "nullsrc=size=1280x720:duration=180:rate=30[v5_last_null]");
  assert.equal(ffmpegContext.filterComplex[5], "[v5_last_src]reverse,select='eq(n,0)',reverse,scale=1280:720[v5_last_frame]");
  assert.equal(ffmpegContext.filterComplex[6], "[v5_last_null][v5_last_frame]overlay=format=auto,fps=30[v5_last]");
});
