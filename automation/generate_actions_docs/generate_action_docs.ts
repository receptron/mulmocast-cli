import fs from "fs";
import path from "path";
import { mermaid } from "./graph_to_mermaid.js";
import { GraphData } from "graphai";

const GRAPH_DATA_SUFFIX = "_graph_data";

const loadTemplate = (): string => {
  const templatePath = path.join(process.cwd(), "automation", "generate_actions_docs", "docs_template.md");
  return fs.readFileSync(templatePath, "utf8");
};

const replaceTemplate = (template: string, replacements: Record<string, string>): string => {
  let result = template;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
};

const generateMermaid = (graphData: GraphData): string => {
  return mermaid(graphData);
};

const extractGraphDataList = async (filePath: string): Promise<Array<{ name: string; graphData: GraphData }>> => {
  try {
    const module = await import(filePath);
    const results: Array<{ name: string; graphData: GraphData }> = [];

    Object.entries(module).forEach(([key, value]) => {
      if (key.endsWith(GRAPH_DATA_SUFFIX) && value) {
        results.push({ name: key, graphData: value as GraphData });
      }
    });

    return results;
  } catch (error) {
    throw new Error(`  Import failed for ${filePath}: ${error}`);
  }
};

const generateGitHubUrl = (filePath: string): string => {
  const repoOwner = "receptron";
  const repoName = "mulmocast-cli";
  const branch = "main";

  const relativePath = filePath.replace(process.cwd(), "").replace(/^\//, "");

  return `https://github.com/${repoOwner}/${repoName}/blob/${branch}/${relativePath}`;
};

const generateDocument = async (scriptPath: string): Promise<void> => {
  const scriptName = path.basename(scriptPath, ".ts");
  const scriptDir = path.dirname(scriptPath);

  const graphDataList = await extractGraphDataList(scriptPath);

  if (!graphDataList.length) {
    return;
  }

  const mermaidSections = graphDataList
    .map(({ name, graphData }) => {
      const diagram = generateMermaid(graphData);
      return [`### ${name}`, "", "```mermaid", diagram, "```"].join("\n");
    })
    .join("\n\n");
  const githubUrl = generateGitHubUrl(scriptPath);

  const template = loadTemplate();
  const replacements = {
    SCRIPT_NAME: scriptName,
    SCRIPT_PATH: githubUrl,
    MERMAID_SECTIONS: mermaidSections,
    GENERATED_DATE: new Date().toISOString(),
  };

  const document = replaceTemplate(template, replacements);

  const outputPath = path.join(scriptDir, `${scriptName}.docs.md`);
  fs.writeFileSync(outputPath, document);
};

const main = async (): Promise<void> => {
  const actionsDir = path.join(process.cwd(), "src", "actions");

  const files = fs.readdirSync(actionsDir).filter((file) => file.endsWith(".ts") && file !== "index.ts");

  for (const file of files) {
    const filePath = path.join(actionsDir, file);
    await generateDocument(filePath);
  }
};

main().catch((error) => {
  throw new Error(error);
});
