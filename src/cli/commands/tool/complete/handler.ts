import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { GraphAILogger } from "graphai";
import { completeScript, templateExists, styleExists } from "../../../../tools/complete_script.js";

type CompleteHandlerArgs = {
  file: string;
  o?: string;
  t?: string;
  s?: string;
  v?: boolean;
};

export const handler = async (argv: CompleteHandlerArgs) => {
  const { file, o: outputPath, t: templateName, s: styleName, v: verbose } = argv;

  if (!file) {
    GraphAILogger.error("Error: Input file is required");
    process.exit(1);
  }

  const inputPath = path.resolve(file);

  const inputData = (() => {
    try {
      const content = readFileSync(inputPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      GraphAILogger.error(`Error reading file: ${inputPath}`);
      GraphAILogger.error((error as Error).message);
      process.exit(1);
    }
  })();

  if (templateName && !templateExists(templateName)) {
    GraphAILogger.warn(`Warning: Template '${templateName}' not found`);
  }

  if (styleName && !styleExists(styleName)) {
    GraphAILogger.warn(`Warning: Style '${styleName}' not found`);
  }

  const result = completeScript(inputData, { templateName, styleName });

  if (!result.success) {
    GraphAILogger.error("Validation errors:");
    result.error.issues.forEach((issue) => {
      GraphAILogger.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  if (verbose) {
    if (styleName) GraphAILogger.info(`Applied style: ${styleName}`);
    if (templateName) GraphAILogger.info(`Applied template: ${templateName}`);
  }

  const outputFilePath = outputPath ? path.resolve(outputPath) : inputPath.replace(/\.json$/, "_completed.json");

  writeFileSync(outputFilePath, JSON.stringify(result.data, null, 2));

  GraphAILogger.info(`Completed script written to: ${outputFilePath}`);
};
