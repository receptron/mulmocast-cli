import { GraphAILogger } from "graphai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import test from "node:test";
// import assert from "node:assert";

import { mulmoScriptSchema } from "../../src/types/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("test mulmoScriptSchema.parse in scripts/test dir ", async () => {
  // const jsonData = {};
  const basePath = path.resolve(__dirname, "../../scripts/test/");
  fs.readdirSync(basePath).map((file) => {
    if (!file.endsWith(".json") || file === "mulmo_story.json") {
      return;
    }
    try {
      const content = fs.readFileSync(path.resolve(basePath, file), "utf-8");
      // Skip empty files
      if (!content.trim()) {
        return;
      }
      const jsonData = JSON.parse(content);
      mulmoScriptSchema.parse(jsonData);
    } catch (e) {
      GraphAILogger.info(file, e);
    }
  });
});
