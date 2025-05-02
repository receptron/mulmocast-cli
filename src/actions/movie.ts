import ffmpeg from "fluent-ffmpeg";
import { MulmoStudio } from "../types";
import { MulmoScriptMethods } from "../methods";
import { getOutputBGMFilePath, getOutputVideoFilePath } from "../utils/file";

const createVideo = (audioPath: string, outputVideoPath: string, studio: MulmoStudio) => {
  const start = performance.now();
  let command = ffmpeg();

  if (studio.beats.some((beat) => !beat.image)) {
    console.error("beat.image is not set. Please run `yarn run images ${file}` ");
    return;
  }

  // Add each image input
  studio.beats.forEach((beat) => {
    command = command.input(beat.image!); // HACK
  });
  const imageCount = studio.beats.length;
  const canvasInfo = MulmoScriptMethods.getCanvasSize(studio.script);

  const filterComplexParts: string[] = [];
  studio.beats.forEach((beat, index) => {
    // Resize background image to match canvas dimensions
    const duration = beat.duration! + (index === 0 ? MulmoScriptMethods.getPadding(studio.script) / 1000 : 0);
    const parts =
      `[${index}:v]loop=loop=-1:size=1:start=0,` +
      `trim=duration=${duration},` +
      `fps=30,` +
      `setpts=PTS-STARTPTS,` +
      `scale=${canvasInfo.width}:${canvasInfo.height},` +
      `setsar=1,format=yuv420p` +
      `[v${index}]`;
    // console.log(parts);
    filterComplexParts.push(parts);
  });

  // Concatenate the trimmed images
  const concatInput = studio.beats.map((_, index) => `[v${index}]`).join("");
  filterComplexParts.push(`${concatInput}concat=n=${imageCount}:v=1:a=0[v]`);

  // Apply the filter complex for concatenation and map audio input
  command
    .complexFilter(filterComplexParts)
    .input(audioPath) // Add audio input
    .outputOptions([
      "-preset veryfast", // Faster encoding
      "-map [v]", // Map the video stream
      `-map ${imageCount /* + captionCount*/}:a`, // Map the audio stream (audio is the next input after all images)
      "-c:v h264_videotoolbox", // Set video codec
      "-threads 8",
      "-filter_threads 8",
      "-b:v 5M", // bitrate (only for videotoolbox)
      "-bufsize",
      "10M", // Add buffer size for better quality
      "-maxrate",
      "7M", // Maximum bitrate
      "-r 30", // Set frame rate
      "-pix_fmt yuv420p", // Set pixel format for better compatibility
    ])
    .on("start", (__cmdLine) => {
      console.log("Started FFmpeg ..."); // with command:', cmdLine);
    })
    .on("error", (err, stdout, stderr) => {
      console.error("Error occurred:", err);
      console.error("FFmpeg stdout:", stdout);
      console.error("FFmpeg stderr:", stderr);
    })
    .on("end", () => {
      const end = performance.now();
      console.log(`Video created successfully! ${Math.round(end - start) / 1000} sec`);
    })
    .output(outputVideoPath)
    .run();
};

export const movie = async (studio: MulmoStudio, files: { outDirPath: string }) => {
  const { outDirPath } = files;
  const audioPath = getOutputBGMFilePath(outDirPath, studio.filename);
  const outputVideoPath = getOutputVideoFilePath(outDirPath, studio.filename);

  createVideo(audioPath, outputVideoPath, studio);
};
