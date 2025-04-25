import "dotenv/config";
// import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";
import { ScriptData, PodcastScript } from "./type";

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  // const parsedPath = path.parse(scriptPath);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;
  script.script.forEach((scriptData: ScriptData) => {
    console.log(scriptData.speaker + ":" + scriptData.text);
  });
};

main();
