import fs from "fs";
import { ScriptData } from "./type";

import { readPodcastScriptFile } from "./utils";

interface Replacement {
  from: string;
  to: string;
}

export function replacePairs(str: string, replacements: Replacement[]): string {
  replacements.forEach(({ from, to }) => {
    // Escape any special regex characters in the 'from' string.
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedFrom, "g");
    str = str.replace(regex, to);
  });
  return str;
}

export const replacements: Replacement[] = [
  { from: "Anthropic", to: "アンスロピック" },
  { from: "OpenAI", to: "オープンエーアイ" },
  { from: "AGI", to: "エージーアイ" },
  { from: "GPU", to: "ジーピーユー" },
  { from: "TPU", to: "ティーピーユー" },
  { from: "CPU", to: "シーピーユー" },
  { from: "LPU", to: "エルピーユー" },
  { from: "Groq", to: "グロック" },
  { from: "TSMC", to: "ティーエスエムシー" },
  { from: "NVIDIA", to: "エヌビディア" },
  { from: "1つ", to: "ひとつ" },
  { from: "2つ", to: "ふたつ" },
  { from: "3つ", to: "みっつ" },
  { from: "4つ", to: "よっつ" },
  { from: "5つ", to: "いつつ" },
  { from: "危険な面", to: "危険なめん" },
  { from: "その通り！", to: "その通り。" },
];

const main = async () => {
  const arg2 = process.argv[2];
  const readData = readPodcastScriptFile(arg2, "no file exists")!;
  const { podcastData, podcastDataPath } = readData;

  podcastData.script = podcastData.script.map((scriptData: ScriptData) => {
    scriptData.ttsText = replacePairs(scriptData.text, replacements);
    return scriptData;
  });
  fs.writeFileSync(podcastDataPath, JSON.stringify(podcastData, null, 2));
};

if (process.argv[1] === __filename) {
  main();
}
