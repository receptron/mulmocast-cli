import fs from "fs";
import path from "path";
import test from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "url";
import { z } from "zod";
import { mulmoScriptSchema, mulmoPromptTemplateSchema } from "../../src/types/schema.js";
import { MulmoScriptMethods } from "../../src/methods/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function: Validate JSON file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateJsonFile = (filePath: string, schema: z.ZodObject<any>): { isValid: boolean; error?: string; isEmpty?: boolean } => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Skip empty files
    if (!content.trim()) {
      return { isValid: true, isEmpty: true };
    }
    const jsonData = JSON.parse(content);
    if (schema === mulmoScriptSchema) {
      MulmoScriptMethods.validate(jsonData);
    } else {
      schema.parse(jsonData);
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Get JSON files in a directory
const getJsonFilesInDirectory = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((file) => path.extname(file) === ".json")
    .map((file) => path.join(dirPath, file));
};

// Get all subdirectories from a directory
const getSubdirectories = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(dirPath, dirent.name));
};

test("JSON files in scripts directory should conform to mulmoScriptSchema", async (t) => {
  const scriptsDir = path.resolve(__dirname, "../../scripts");
  const directories = getSubdirectories(scriptsDir);

  for (const dir of directories) {
    const jsonFiles = getJsonFilesInDirectory(dir);

    for (const filePath of jsonFiles) {
      if (!filePath.endsWith("_story.json") && !filePath.endsWith("_template.json")) {
        await t.test(`Validating ${path.relative(scriptsDir, filePath)}`, async () => {
          const result = validateJsonFile(filePath, mulmoScriptSchema);
          if (!result.isValid) {
            assert.fail(`File validation failed: ${result.error} \n ${filePath}`);
          }
        });
      }
    }
  }
});

test("JSON files in templates directory should conform to mulmoPromptTemplateSchema", async (t) => {
  const templatesDir = path.resolve(__dirname, "../../assets/templates");
  const jsonFiles = getJsonFilesInDirectory(templatesDir);

  for (const filePath of jsonFiles) {
    await t.test(`Validating template: ${path.basename(filePath)}`, async () => {
      const result = validateJsonFile(filePath, mulmoPromptTemplateSchema);
      if (!result.isValid) {
        assert.fail(`File validation failed: ${result.error}`);
      }
    });
  }
});
