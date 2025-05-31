import test from "node:test";
import assert from "node:assert";

import { getVideoPart, getAudioPart } from "../../src/actions/movie.js";

test("test getVideoParts image", async () => {
  const { videoPart } = getVideoPart(1, "image", 200, { width: 100, height: 300 });
  assert.equal(
    videoPart,
    "[1:v]loop=loop=-1:size=1:start=0,trim=duration=200,fps=30,setpts=PTS-STARTPTS,scale=w=100:h=300:force_original_aspect_ratio=decrease,pad=100:300:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
  );
});

test("test getVideoParts movie", async () => {
  const { videoPart } = getVideoPart(1, "movie", 200, { width: 100, height: 300 });
  assert.equal(
    videoPart,
    "[1:v]tpad=stop_mode=clone:stop_duration=400,trim=duration=200,fps=30,setpts=PTS-STARTPTS,scale=w=100:h=300:force_original_aspect_ratio=decrease,pad=100:300:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v1]",
  );
});

test("test getAudioPart movie", async () => {
  const { audioPart } = getAudioPart(1, 100, 100, 0.2);
  assert.equal(audioPart, "[1:a]atrim=duration=100,adelay=100000|100000,volume=0.2,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1]");
});
