import "dotenv/config";
import { ToolCliArgs } from "../../../../types/cli_types.js";
import { existsSync, createReadStream, writeFileSync, mkdirSync } from "fs";
import { resolve, basename, extname, join } from "path";
import OpenAI from "openai";
import { mulmoScriptSchema, MulmoScript } from "../../../../types/index.js";
import { ffmpegGetMediaDuration } from "../../../../utils/ffmpeg_utils.js";
import { GraphAILogger } from "graphai";

const createMulmoScript = (fullPath: string, beats: { text: string; duration: number }[]): MulmoScript => {
  return mulmoScriptSchema.parse({
    $mulmocast: {
      version: "1.1",
      credit: "closing",
    },
    canvasSize: {
      width: 1536,
      height: 1024,
    },
    lang: "en",
    title: "Music Video",
    captionParams: {
      lang: "en",
      styles: ["font-size: 64px", "width: 90%", "padding-left: 5%", "padding-right: 5%"],
    },
    beats,
    audioParams: {
      bgm: {
        kind: "path",
        path: fullPath,
      },
      padding: 0.0,
      introPadding: 0.0,
      closingPadding: 0.0,
      outroPadding: 0.0,
      bgmVolume: 1.0,
      audioVolume: 0.0,
      suppressSpeech: true,
    },
  });
};

export const handler = async (argv: ToolCliArgs<{ file: string }>) => {
  const { file } = argv;
  const fullPath = resolve(file);
  const filename = basename(file, extname(file));
  if (!existsSync(fullPath)) {
    GraphAILogger.error(`Error: File '${fullPath}' does not exist.`);
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    GraphAILogger.error("Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  try {
    // Get audio duration using FFmpeg
    const { duration: audioDuration } = await ffmpegGetMediaDuration(fullPath);
    GraphAILogger.info(`Audio duration: ${audioDuration.toFixed(2)} seconds`);

    const openai = new OpenAI({ apiKey });

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(fullPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    });

    if (transcription.segments) {
      const starts = transcription.segments.map((segment) => segment.start);
      starts[0] = 0;
      starts.push(audioDuration);
      // Create beats from transcription segments
      const beats = transcription.segments.map((segment, index) => {
        const duration = Math.round((starts[index + 1] - starts[index]) * 100) / 100;
        return {
          text: segment.text,
          duration,
          /*
          image: {
            type: "textSlide",
            slide: {
              title: "Place Holder",
            },
          },
          */
        };
      });

      // Create the script with the processed beats
      const script = createMulmoScript(fullPath, beats);

      // Save script to output directory
      const outputDir = "output";
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = join(outputDir, `${filename}.json`);
      writeFileSync(outputPath, JSON.stringify(script, null, 2));
      GraphAILogger.info(`Script saved to: ${outputPath}`);
    }
  } catch (error) {
    GraphAILogger.error("Error transcribing audio:", error);
    process.exit(1);
  }
};
