#!/usr/bin/env node

import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, CallToolRequest, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GraphAILogger } from "graphai";
import { audio, images, movie, captions, pdf } from "../actions/index.js";
import { initializeContext, runTranslateIfNeeded } from "../cli/helpers.js";
import { outDirName } from "../types/const.js";
import { resolveDirPath, mkdir, generateTimestampedFileName } from "../utils/file.js";
import type { MulmoScript } from "../types/type.js";
import { MulmoScriptMethods } from "../methods/index.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load MulmoScript JSON Schema from file
const MULMO_SCRIPT_JSON_SCHEMA = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../assets/schemas/html_prompt.json"), "utf8"));

const server = new Server(
  {
    name: "mulmocast-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Helper function to save MulmoScript content to output directory
const saveMulmoScriptToOutput = async (mulmoScript: MulmoScript): Promise<string> => {
  const baseDirPath = process.cwd();
  const outputDirPath = path.resolve(baseDirPath, outDirName);

  // Create timestamp-based filename similar to __clipboard handling
  const fileName = generateTimestampedFileName("mcp_script");

  // Ensure output directory exists
  mkdir(outputDirPath);

  // Save MulmoScript to file
  const filePath = resolveDirPath(outputDirPath, `${fileName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(mulmoScript, null, 2), "utf8");

  return filePath;
};

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate",
        description: "Generate movie or PDF from MulmoScript content",
        inputSchema: {
          type: "object",
          properties: {
            cmd: {
              type: "string",
              enum: ["movie", "pdf"],
              description: "Command to execute: 'movie' to generate video, 'pdf' to generate PDF",
            },
            mulmoScript: MULMO_SCRIPT_JSON_SCHEMA,
            options: {
              type: "object",
              description: "Optional generation parameters",
              properties: {
                pdfMode: { type: "string", enum: ["slide", "talk", "handout"], description: "PDF generation mode (for PDF only)" },
                pdfSize: { type: "string", enum: ["A4", "Letter", "Legal"], description: "PDF page size (for PDF only)" },
                lang: { type: "string", description: "Language for translation" },
                caption: { type: "string", description: "Caption language" },
                force: { type: "boolean", description: "Force regeneration" },
                verbose: { type: "boolean", description: "Enable verbose logging" },
              },
              additionalProperties: false,
            },
          },
          required: ["cmd", "mulmoScript"],
          additionalProperties: false,
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    if (name !== "generate") {
      throw new Error(`Unknown tool: ${name}`);
    }

    const {
      cmd,
      mulmoScript,
      options = {},
    } = args as {
      cmd: "movie" | "pdf";
      mulmoScript: MulmoScript;
      options?: {
        pdfMode?: string;
        pdfSize?: string;
        lang?: string;
        caption?: string;
        force?: boolean;
        verbose?: boolean;
      };
    };

    // Validate MulmoScript schema
    const validatedScript = MulmoScriptMethods.validate(mulmoScript);

    // Save MulmoScript to output directory
    const filePath = await saveMulmoScriptToOutput(validatedScript);

    // Create argv-like object for CLI compatibility
    const argv = {
      file: filePath,
      l: options.lang,
      c: options.caption,
      f: options.force || false,
      v: options.verbose || false,
      pdf_mode: options.pdfMode || "handout",
      pdf_size: options.pdfSize || "Letter",
      _: [],
      $0: "mcp-server",
    };

    // Initialize context using the saved file
    const context = await initializeContext(argv);
    if (!context) {
      throw new Error("Failed to initialize context from MulmoScript");
    }

    // Run translation if needed
    await runTranslateIfNeeded(context);

    // Execute the requested command
    switch (cmd) {
      case "movie":
        // Generate movie (audio + images + captions + movie)
        await audio(context).then(images).then(captions).then(movie);
        return {
          content: [
            {
              type: "text",
              text: `Movie generated successfully from MulmoScript. Output saved to: ${context.fileDirs.outDirPath}`,
            },
          ],
        };

      case "pdf":
        // Generate images first, then PDF
        await images(context);
        await pdf(context, options.pdfMode || "handout", options.pdfSize || "Letter");
        return {
          content: [
            {
              type: "text",
              text: `PDF generated successfully from MulmoScript. Output saved to: ${context.fileDirs.outDirPath}`,
            },
          ],
        };

      default:
        throw new Error(`Unknown command: ${cmd}. Supported commands: movie, pdf`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  GraphAILogger.error("MulmoCast MCP Server running on stdio");
}

main().catch((error) => {
  GraphAILogger.error("Failed to start MCP server:", error);
  process.exit(1);
});
