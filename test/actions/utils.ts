// Helper function to create mock context
import { z } from "zod";
import { type MulmoStudioContext, type MulmoBeat, mulmoScriptSchema, mulmoBeatSchema } from "../../src/types/index.js";

const mulmoScriptSchemaNoBeats = mulmoScriptSchema.extend({
  beats: z.array(mulmoBeatSchema).min(0),
});

const mulmoScript = {
  $mulmocast: {
    version: "1.1",
  },
  title: "Test Script",
  beats: [],
  lang: "en",
  canvasSize: { width: 1920, height: 1080 },
};

const data = mulmoScriptSchemaNoBeats.safeParse(mulmoScript);
export const createMockContext = (): MulmoStudioContext => ({
  fileDirs: {
    mulmoFilePath: "/test/path/test.yaml",
    mulmoFileDirPath: "/test/path",
    baseDirPath: "/test",
    outDirPath: "/test/output",
    imageDirPath: "/test/images",
    audioDirPath: "/test/audio",
  },
  studio: {
    filename: "test_studio",
    script: data.data,
    beats: [],
    toJSON: () => "{}",
  },
  force: false,
  presentationStyle: {
    imageParams: {
      provider: "openai",
      model: "dall-e-3",
      style: "natural",
      moderation: "auto",
    },
    speechParams: data.data.speechParams,
  },
  sessionState: {
    inSession: {
      audio: false,
      image: false,
      video: false,
      multiLingual: false,
      caption: false,
      pdf: false,
    },
    inBeatSession: {
      audio: {},
      image: {},
      movie: {},
      multiLingual: {},
      caption: {},
      html: {},
    },
  },
});

// Helper function to create mock beat
export const createMockBeat = (overrides: Partial<MulmoBeat> = {}): MulmoBeat => ({
  text: "Test beat text",
  ...overrides,
});
