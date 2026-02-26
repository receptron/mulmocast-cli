/* eslint-disable no-console */
import path from "path";
import { getMarkdownStyleNames, getMarkdownCategories, getMarkdownStylesByCategory } from "../../../../data/markdownStyles.js";
import { bgmAssets } from "../../../../data/bgmAssets.js";
import { templateDataSet } from "../../../../data/templateDataSet.js";
import { slideThemes } from "../../../../data/slideThemes.js";
import { provider2TTSAgent, provider2ImageAgent, provider2MovieAgent, provider2LLMAgent } from "../../../../types/provider2agent.js";
import { findConfigFile, loadMulmoConfig, mergeConfigWithScript } from "../../../../utils/mulmo_config.js";
import { readMulmoScriptFile } from "../../../../utils/file.js";
import YAML from "yaml";

type InfoCategory = "styles" | "bgm" | "templates" | "voices" | "images" | "movies" | "llm" | "themes" | "config" | "merged";

interface InfoCliArgs {
  category?: string;
  format: string;
  script?: string;
}

const formatOutput = (data: unknown, format: string): string => {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  } else if (format === "yaml") {
    return YAML.stringify(data);
  }
  return "";
};

const getStylesInfo = () => {
  const categories = getMarkdownCategories();
  const result: Record<string, string[]> = {};
  for (const category of categories) {
    result[category] = getMarkdownStylesByCategory(category).map((s) => s.name);
  }
  return { styles: result, total: getMarkdownStyleNames().length };
};

const getBgmInfo = () => {
  return {
    license: bgmAssets.license,
    bgms: bgmAssets.bgms.map((b) => ({
      name: b.name,
      title: b.title,
      duration: b.duration,
      prompt: b.prompt,
    })),
  };
};

const getTemplatesInfo = () => {
  return {
    templates: Object.keys(templateDataSet),
  };
};

const getVoicesInfo = () => {
  const result: Record<string, { defaultVoice?: string; defaultModel?: string; models?: string[] }> = {};
  for (const [provider, config] of Object.entries(provider2TTSAgent)) {
    result[provider] = {
      defaultVoice: (config as { defaultVoice?: string }).defaultVoice,
      defaultModel: (config as { defaultModel?: string }).defaultModel,
      models: (config as { models?: string[] }).models,
    };
  }
  return { ttsProviders: result };
};

const getImagesInfo = () => {
  const result: Record<string, { defaultModel: string; models: string[] }> = {};
  for (const [provider, config] of Object.entries(provider2ImageAgent)) {
    result[provider] = {
      defaultModel: config.defaultModel,
      models: config.models,
    };
  }
  return { imageProviders: result };
};

const getMoviesInfo = () => {
  const result: Record<string, { defaultModel: string; models: string[] }> = {};
  for (const [provider, config] of Object.entries(provider2MovieAgent)) {
    result[provider] = {
      defaultModel: config.defaultModel,
      models: config.models,
    };
  }
  return { movieProviders: result };
};

const getLlmInfo = () => {
  const result: Record<string, { defaultModel: string; models: readonly string[] }> = {};
  for (const [provider, config] of Object.entries(provider2LLMAgent)) {
    result[provider] = {
      defaultModel: config.defaultModel,
      models: config.models,
    };
  }
  return { llmProviders: result };
};

const getThemesInfo = () => {
  return { themes: slideThemes, total: Object.keys(slideThemes).length };
};

const printStylesText = () => {
  const categories = getMarkdownCategories();
  console.log("\n📎 Markdown Styles (100 styles in 10 categories)\n");
  console.log("Usage: Set 'style' property in markdown image beat");
  console.log('Example: { "type": "markdown", "markdown": "# Title", "style": "corporate-blue" }\n');
  for (const category of categories) {
    const styles = getMarkdownStylesByCategory(category);
    console.log(`  ${category.toUpperCase()} (${styles.length} styles)`);
    console.log(`    ${styles.map((s) => s.name).join(", ")}\n`);
  }
};

const printBgmText = () => {
  console.log("\n🎵 BGM Assets\n");
  console.log("Usage: Set 'audioParams.bgm' in your script");
  console.log('Example: { "audioParams": { "bgm": { "kind": "url", "url": "..." } } }\n');
  console.log(`  License: ${bgmAssets.license}\n`);
  for (const bgm of bgmAssets.bgms) {
    console.log(`  ${bgm.name}`);
    console.log(`    Title: ${bgm.title}`);
    console.log(`    Duration: ${bgm.duration}`);
    console.log(`    Prompt: ${bgm.prompt}`);
    console.log(`    URL: ${bgm.url}\n`);
  }
};

const printTemplatesText = () => {
  const templates = Object.keys(templateDataSet);
  console.log("\n📝 Script Templates\n");
  console.log("Usage: Select template in 'mulmo tool scripting'\n");
  console.log(`  Available templates (${templates.length}):\n`);
  for (const template of templates) {
    console.log(`    - ${template}`);
  }
  console.log("");
};

const printVoicesText = () => {
  console.log("\n🎤 TTS (Text-to-Speech) Providers\n");
  console.log("Usage: Set 'speechParams.speakers' in your script");
  console.log('Example: { "speechParams": { "speakers": { "Presenter": { "provider": "openai", "voiceId": "shimmer" } } } }\n');
  for (const [provider, config] of Object.entries(provider2TTSAgent)) {
    const cfg = config as { defaultVoice?: string; defaultModel?: string; models?: string[] };
    console.log(`  ${provider.toUpperCase()}`);
    if (cfg.defaultVoice) console.log(`    Default voice: ${cfg.defaultVoice}`);
    if (cfg.defaultModel) console.log(`    Default model: ${cfg.defaultModel}`);
    if (cfg.models) console.log(`    Models: ${cfg.models.join(", ")}`);
    console.log("");
  }
};

const printImagesText = () => {
  console.log("\n🖼️  Image Generation Providers\n");
  console.log("Usage: Set 'imageParams.provider' and 'imageParams.model' in your script\n");
  for (const [provider, config] of Object.entries(provider2ImageAgent)) {
    console.log(`  ${provider.toUpperCase()}`);
    console.log(`    Default model: ${config.defaultModel}`);
    console.log(`    Models: ${config.models.join(", ")}\n`);
  }
};

const printMoviesText = () => {
  console.log("\n🎬 Movie Generation Providers\n");
  console.log("Usage: Set 'movieParams.provider' and 'movieParams.model' in your script\n");
  for (const [provider, config] of Object.entries(provider2MovieAgent)) {
    console.log(`  ${provider.toUpperCase()}`);
    console.log(`    Default model: ${config.defaultModel}`);
    console.log(`    Models: ${config.models.join(", ")}\n`);
  }
};

const printLlmText = () => {
  console.log("\n🤖 LLM Providers\n");
  console.log("Usage: Set 'htmlImageParams.provider' in your script\n");
  for (const [provider, config] of Object.entries(provider2LLMAgent)) {
    console.log(`  ${provider.toUpperCase()}`);
    console.log(`    Default model: ${config.defaultModel}`);
    console.log(`    Models: ${config.models.join(", ")}\n`);
  }
};

const printThemesText = () => {
  const themeEntries = Object.entries(slideThemes);
  console.log(`\n🎨 Slide Themes (${themeEntries.length} themes)\n`);
  console.log("Usage: Set 'slideParams.theme' in your script\n");
  for (const [name, theme] of themeEntries) {
    const { bg, primary, accent } = theme.colors;
    const { title, body, mono } = theme.fonts;
    console.log(`  ${name.padEnd(10)} - bg: ${bg}, primary: ${primary}, accent: ${accent} | fonts: ${title}/${body}/${mono}`);
  }
  console.log("");
};

const getConfigInfo = () => {
  const baseDirPath = process.cwd();
  const configPath = findConfigFile(baseDirPath);
  if (!configPath) {
    return { configFile: null, config: null };
  }
  const config = loadMulmoConfig(baseDirPath);
  return { configFile: configPath, config };
};

const printConfigText = () => {
  const baseDirPath = process.cwd();
  const configPath = findConfigFile(baseDirPath);
  console.log("\n📄 mulmo.config.json\n");
  if (!configPath) {
    console.log("  No mulmo.config.json found.");
    console.log("  Searched: CWD → ~\n");
    return;
  }
  console.log(`  Active config: ${configPath}\n`);
  const config = loadMulmoConfig(baseDirPath);
  if (config) {
    console.log(JSON.stringify(config, null, 2));
  }
  console.log("");
};

const readScriptFile = (scriptPath: string): Record<string, unknown> => {
  const result = readMulmoScriptFile<Record<string, unknown>>(scriptPath, `Error: File not found: ${scriptPath}`);
  if (!result) {
    console.error(`Error: Could not read script file: ${scriptPath}`);
    process.exit(1);
  }
  return result.mulmoData;
};

const getMergedInfo = (scriptPath?: string) => {
  if (!scriptPath) {
    console.error("Error: --script <file> is required for 'merged' category");
    process.exit(1);
  }
  const baseDirPath = process.cwd();
  const configResult = loadMulmoConfig(baseDirPath);
  const script = readScriptFile(scriptPath);

  if (!configResult) {
    return { configFile: null, merged: script };
  }
  const configPath = findConfigFile(baseDirPath);
  const merged = mergeConfigWithScript(configResult, script);
  return { configFile: configPath, defaults: configResult.defaults, override: configResult.override, merged };
};

const printMergedText = (scriptPath?: string) => {
  if (!scriptPath) {
    console.error("Error: --script <file> is required for 'merged' category");
    console.error("Usage: mulmo tool info merged --script <script.json>");
    process.exit(1);
  }
  const baseDirPath = process.cwd();
  const configResult = loadMulmoConfig(baseDirPath);
  const script = readScriptFile(scriptPath);

  console.log("\n📋 Merged Script Result\n");
  console.log(`  Script: ${path.resolve(scriptPath)}`);

  if (!configResult) {
    console.log("  Config: (none)\n");
    console.log(JSON.stringify(script, null, 2));
    console.log("");
    return;
  }

  const configPath = findConfigFile(baseDirPath);
  console.log(`  Config: ${configPath}`);
  console.log(`  Override: ${configResult.override ? "yes" : "no"}\n`);

  const merged = mergeConfigWithScript(configResult, script);
  console.log(JSON.stringify(merged, null, 2));
  console.log("");
};

const printAllCategories = () => {
  console.log("\n📚 Available Info Categories\n");
  console.log("  Usage: mulmo tool info <category> [--format json|yaml]\n");
  console.log("  Categories:");
  console.log("    styles     - Markdown slide styles (100 styles in 10 categories)");
  console.log("    bgm        - Background music assets");
  console.log("    templates  - Script templates for 'mulmo tool scripting'");
  console.log("    voices     - TTS providers and voice options");
  console.log("    images     - Image generation providers and models");
  console.log("    movies     - Movie generation providers and models");
  console.log("    llm        - LLM providers and models");
  console.log("    themes     - Slide themes and color palettes");
  console.log("    config     - Active mulmo.config.json location and contents");
  console.log("    merged     - Show script merged with mulmo.config.json (--script <file>)\n");
};

const validCategories: InfoCategory[] = ["styles", "bgm", "templates", "voices", "images", "movies", "llm", "themes", "config", "merged"];

const isValidCategory = (category: string): category is InfoCategory => {
  return validCategories.includes(category as InfoCategory);
};

export const handler = (argv: InfoCliArgs) => {
  const { category, format = "text", script: scriptPath } = argv;

  if (!category) {
    if (format === "text") {
      printAllCategories();
    } else {
      const allData = {
        categories: validCategories,
        description: "Use 'mulmo tool info <category>' for detailed information",
      };
      console.log(formatOutput(allData, format));
    }
    return;
  }

  if (!isValidCategory(category)) {
    console.error(`Invalid category: ${category}`);
    console.error(`Valid categories: ${validCategories.join(", ")}`);
    process.exit(1);
  }

  const dataGetters: Record<InfoCategory, () => unknown> = {
    styles: getStylesInfo,
    bgm: getBgmInfo,
    templates: getTemplatesInfo,
    voices: getVoicesInfo,
    images: getImagesInfo,
    movies: getMoviesInfo,
    llm: getLlmInfo,
    themes: getThemesInfo,
    config: getConfigInfo,
    merged: () => getMergedInfo(scriptPath),
  };

  const textPrinters: Record<InfoCategory, () => void> = {
    styles: printStylesText,
    bgm: printBgmText,
    templates: printTemplatesText,
    voices: printVoicesText,
    images: printImagesText,
    movies: printMoviesText,
    llm: printLlmText,
    themes: printThemesText,
    config: printConfigText,
    merged: () => printMergedText(scriptPath),
  };

  if (format === "text") {
    textPrinters[category]();
  } else {
    const data = dataGetters[category]();
    console.log(formatOutput(data, format));
  }
};
