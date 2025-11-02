import fs from "fs";
import path from "path";

const speakers = {};
const beats = [];
["shimmer", "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage"].map((voiceId: string) => {
  speakers[voiceId] = {
    provider: "openai",
    voiceId,
  };
  beats.push({
    id: voiceId,
    speaker: voiceId,
    text: `こんにちは, これは音声テストです。音声は ${voiceId} です`,
    image: {
      type: "markdown",
      markdown: [`# Voice is ${voiceId}`],
    },
  });
  console.log(voiceId);
});

const data = {
  $mulmocast: {
    version: "1.0",
    credit: "closing",
  },
  speechParams: {
    speakers,
  },
  beats,
};

console.log(data);

// Write to file
const outputPath = path.resolve("scripts/samples/openai_voice.json");
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to: ${outputPath}`);
