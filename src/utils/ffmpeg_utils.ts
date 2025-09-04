import ffmpeg from "fluent-ffmpeg";
import { GraphAILogger } from "graphai";
import fs from "fs";

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
      .on("start", (__cmdLine) => {
        GraphAILogger.log("Started FFmpeg ..."); // with command:', cmdLine);
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

export const ffmpegGetMediaDuration = (filePath: string) => {
  return new Promise<{ duration: number; hasAudio: boolean }>((resolve, reject) => {
    // Only check file existence for local paths, not URLs
    if (!filePath.startsWith("http://") && !filePath.startsWith("https://") && !fs.existsSync(filePath)) {
      // NOTE: We don't reject here for scripts/test/test_hello_image.json, which uses mock image agent.
      // reject(new Error(`File not found: ${filePath}`));
      resolve({ duration: 0, hasAudio: false });
      return;
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

export const extractImageFromMovie = (movieFile: string, imagePath: string): Promise<object> => {
  return new Promise<object>((resolve, reject) => {
    ffmpeg(movieFile)
      .outputOptions(["-frames:v 1"])
      .output(imagePath)
      .on("end", () => resolve({}))
      .on("error", (err) => reject(err))
      .run();
  });
};

export const trimMusic = (inputFile: string, startTime: number, duration: number): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    if (!inputFile.startsWith("http://") && !inputFile.startsWith("https://") && !fs.existsSync(inputFile)) {
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
