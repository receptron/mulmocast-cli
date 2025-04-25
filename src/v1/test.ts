import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sound = async (fileName: string, input: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    // response_format: "aac",
    input,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`sound generated: ${input}, ${buffer.length}`);
  const filePath = path.resolve("./scratchpad/" + fileName);
  await fs.promises.writeFile(filePath, buffer);
};

const main = async () => {
  await sound("test.mp3", "Hello World");
};

main();
