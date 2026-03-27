import ffmpeg from "fluent-ffmpeg";
import { GraphAILogger } from "graphai";
import { isFile } from "./file.js";
import fs from "fs";
import { Readable, PassThrough } from "node:stream";

export type FfmpegContext = {
  command: ffmpeg.FfmpegCommand;
  inputCount: number;
  filterComplex: string[];
};

export const setFfmpegPath = (ffmpegPath: string) => {
  ffmpeg.setFfmpegPath(ffmpegPath!);
};

export const setFfprobePath = (ffprobePath: string) => {
  ffmpeg.setFfprobePath(ffprobePath!);
};

export const FfmpegContextInit = (): FfmpegContext => {
  return {
    command: ffmpeg(),
    inputCount: 0,
    filterComplex: [],
  };
};

export const FfmpegContextAddInput = (context: FfmpegContext, input: string, inputOptions?: string[]) => {
  if (inputOptions) {
    context.command.input(input).inputOptions(inputOptions);
  } else {
    context.command.input(input);
  }
  context.inputCount++;
  return context.inputCount - 1; // returned the index of the input
};

export const FfmpegContextPushFormattedAudio = (context: FfmpegContext, sourceId: string, outputId: string, duration: number | undefined = undefined) => {
  if (duration !== undefined) {
    context.filterComplex.push(`${sourceId}atrim=duration=${duration},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo${outputId}`);
  } else {
    context.filterComplex.push(`${sourceId}aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo${outputId}`);
  }
};

export const FfmpegContextInputFormattedAudio = (context: FfmpegContext, input: string, duration: number | undefined = undefined, inputOptions?: string[]) => {
  const index = FfmpegContextAddInput(context, input, inputOptions);
  const audioId = `[a${index}]`;
  FfmpegContextPushFormattedAudio(context, `[${index}:a]`, audioId, duration);
  return audioId;
};

export const FfmpegContextGenerateOutput = (context: FfmpegContext, output: string, options: string[] = []): Promise<number> => {
  return new Promise((resolve, reject) => {
    context.command
      .complexFilter(context.filterComplex)
      .outputOptions(options)
      .output(output)
      .on("start", (cmdLine) => {
        GraphAILogger.log("Started FFmpeg with command:", cmdLine);
      })
      .on("error", (err, stdout, stderr) => {
        GraphAILogger.error("Error occurred:", err);
        GraphAILogger.error("FFmpeg stdout:", stdout);
        GraphAILogger.error("FFmpeg stderr:", stderr);
        GraphAILogger.info("Video/Audio creation failed.", err.message);
        reject(err);
      })
      .on("end", () => {
        resolve(0);
      })
      .run();
  });
};

/** Round up odd dimensions to even (required by libx264 yuv420p) */
export const normalizeEvenDimensions = (width: number, height: number): { width: number; height: number } => {
  return {
    width: width % 2 === 0 ? width : width + 1,
    height: height % 2 === 0 ? height : height + 1,
  };
};

/**
 * Convert a sequence of PNG frames into a video file.
 * Expects files named frame_00000.png, frame_00001.png, etc. in framesDir.
 */
export const framesToVideo = (framesDir: string, outputPath: string, fps: number, width: number, height: number): Promise<void> => {
  const safe = normalizeEvenDimensions(width, height);
  if (safe.width !== width || safe.height !== height) {
    GraphAILogger.info(`framesToVideo: adjusted ${width}x${height} → ${safe.width}x${safe.height} (libx264 yuv420p requires even dimensions)`);
  }
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`${framesDir}/frame_%05d.png`)
      .inputOptions(["-framerate", String(fps)])
      .outputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-vf", `scale=${safe.width}:${safe.height}`])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
};

export const ffmpegGetMediaDuration = (filePath: string) => {
  return new Promise<{ duration: number; hasAudio: boolean }>((resolve, reject) => {
    // Only check file existence for local paths, not URLs
    if (!filePath.startsWith("http://") && !filePath.startsWith("https://")) {
      if (!fs.existsSync(filePath)) {
        // NOTE: We don't reject here for scripts/test/test_hello_image.json, which uses mock image agent.
        // reject(new Error(`File not found: ${filePath}`));
        resolve({ duration: 0, hasAudio: false });
        return;
      }
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        reject("ffmpegGetMediaDuration: path is not file");
        return;
      }
    }
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        GraphAILogger.info("Error while getting metadata:", err);
        reject(err);
      } else {
        const hasAudio = metadata.streams?.some((stream) => stream.codec_type === "audio") ?? false;
        resolve({ duration: metadata.format.duration!, hasAudio });
      }
    });
  });
};

export const extractImageFromMovie = (movieFile: string, imagePath: string, useLastFrame = false): Promise<object> => {
  return new Promise<object>((resolve, reject) => {
    const command = ffmpeg(movieFile);
    if (useLastFrame) {
      command.inputOptions(["-sseof", "-0.1"]);
    }
    command
      .outputOptions(["-frames:v 1"])
      .output(imagePath)
      .on("end", () => resolve({}))
      .on("error", (err) => reject(err))
      .run();
  });
};

export const trimMusic = (inputFile: string, startTime: number, duration: number): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    if (!inputFile.startsWith("http://") && !inputFile.startsWith("https://") && !isFile(inputFile)) {
      reject(new Error(`File not found: ${inputFile}`));
      return;
    }

    if (duration <= 0) {
      reject(new Error(`Invalid duration: duration (${duration}) must be greater than 0`));
      return;
    }

    const chunks: Buffer[] = [];

    ffmpeg(inputFile)
      .seekInput(startTime)
      .duration(duration)
      .format("mp3")
      .on("start", () => {
        GraphAILogger.log(`Trimming audio from ${startTime}s for ${duration}s...`);
      })
      .on("error", (err) => {
        GraphAILogger.error("Error occurred while trimming audio:", err);
        reject(err);
      })
      .on("end", () => {
        const buffer = Buffer.concat(chunks);
        GraphAILogger.log(`Audio trimmed successfully, buffer size: ${buffer.length} bytes`);
        resolve(buffer);
      })
      .pipe()
      .on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
  });
};

export const getBufferDuration = async (buffer: Buffer): Promise<number> => {
  const os = await import("node:os");
  const path = await import("node:path");
  const tmpFile = path.default.join(os.default.tmpdir(), `probe_${Date.now()}.mp4`);
  fs.writeFileSync(tmpFile, buffer);
  try {
    const { duration } = await ffmpegGetMediaDuration(tmpFile);
    return duration;
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
};

export const adjustVideoDuration = async (inputBuffer: Buffer, targetDuration: number): Promise<Buffer> => {
  if (targetDuration <= 0) {
    throw new Error(`Invalid duration: targetDuration (${targetDuration}) must be greater than 0`);
  }

  const os = await import("node:os");
  const path = await import("node:path");
  const tmpDir = os.default.tmpdir();
  const tmpInput = path.default.join(tmpDir, `lipsync_adjust_in_${Date.now()}.mp4`);
  const tmpOutput = path.default.join(tmpDir, `lipsync_adjust_out_${Date.now()}.mp4`);

  fs.writeFileSync(tmpInput, inputBuffer);

  try {
    const { duration: inputDuration } = await ffmpegGetMediaDuration(tmpInput);
    // The lipSync model tends to freeze in the last ~0.2s of output.
    // Strategy: trim the frozen tail, then stretch the remaining (moving)
    // frames to fill the target duration via setpts.
    const trimTail = 0.2;
    const usableDuration = Math.max(inputDuration - trimTail, inputDuration * 0.9);
    const stretchFactor = targetDuration / usableDuration;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpInput)
        .inputOptions(["-t", String(usableDuration)])
        .videoFilters(`setpts=${stretchFactor}*PTS`)
        .outputOptions(["-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac"])
        .output(tmpOutput)
        .on("error", (err) => {
          GraphAILogger.error("Error occurred while adjusting video duration:", err);
          reject(err);
        })
        .on("end", () => {
          GraphAILogger.log(`Video adjusted to ${targetDuration}s (was ${inputDuration}s, trimmed tail ${trimTail}s, stretch ${stretchFactor.toFixed(4)})`);
          resolve();
        })
        .run();
    });

    const resultBuffer = fs.readFileSync(tmpOutput);
    return resultBuffer;
  } finally {
    if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
    if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
  }
};

export const createSilentAudio = (filePath: string, durationSec: number): Promise<void> => {
  const filter = `anullsrc=r=44100:cl=stereo,atrim=duration=${durationSec},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .complexFilter([filter])
      .outputOptions(["-map", "[a]"])
      .output(filePath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
};

export const pcmToMp3 = (rawPcm: Buffer, sampleRate: number = 24000): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const inputStream = new Readable({
      read() {
        this.push(rawPcm);
        this.push(null);
      },
    });

    const outputChunks: Buffer[] = [];
    const outputStream = new PassThrough();

    outputStream.on("data", (chunk: Buffer) => outputChunks.push(chunk));
    outputStream.on("end", () => resolve(Buffer.concat(outputChunks)));
    outputStream.on("error", reject);

    ffmpeg(inputStream)
      .inputFormat("s16le")
      .inputOptions([`-ar ${sampleRate}`, "-ac 1"])
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("error", reject)
      .pipe(outputStream);
  });
};
