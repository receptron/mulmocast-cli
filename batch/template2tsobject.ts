import { getAvailablePromptTemplates, getAvailableScriptTemplates, readTemplatePrompt } from "../src/utils/file.js";
import fs from "fs";
import path from "path";
import util from "util";

const main = () => {
  const promptTemplates = getAvailablePromptTemplates();
  const promptData = util.inspect(promptTemplates, {
    depth: null,
    compact: false,
    sorted: true,
    breakLength: 120,
  });
  const promptTsExport = `export const promptTemplates = ${promptData}\n`;
  fs.writeFileSync("./src/data/promptTemplates.ts", promptTsExport, "utf8");

  const tempImageObj = {};
  const tempObj = Object.values(promptTemplates).reduce((tmp, template) => {
    if (template.filename) {
      const data = readTemplatePrompt(template.filename);
      const image = Object.values(template?.presentationStyle?.imageParams?.images ?? {})[0]?.source?.url;
      if (image) {
        tempImageObj[template.filename] = image;
      }
      tmp[template.filename] = data;
    }
    return tmp;
  }, {});
  const templateDataSet = util.inspect(tempObj, {
    depth: null,
    compact: false,
    sorted: true,
    breakLength: 120,
    maxStringLength: null,
  });
  const templateDataSetExport = `export const templateDataSet = ${templateDataSet}\n\n`;

  const templateImageDataSet = util.inspect(tempImageObj, {
    depth: null,
    compact: false,
    sorted: true,
    breakLength: 120,
    maxStringLength: null,
  });
  const templateImageDataSetExport = `export const templateImageDataSet = ${templateImageDataSet}\n`;

  fs.writeFileSync("./src/data/templateDataSet.ts", templateDataSetExport + templateImageDataSetExport, "utf8");

  //  console.log(promptTsExport);

  const scriptTemplates = getAvailableScriptTemplates();
  const scriptData = util.inspect(scriptTemplates, {
    depth: null,
    compact: false,
    sorted: true,
    breakLength: 120,
  });
  const scriptTsExport = `export const scriptTemplates = ${scriptData}\n`;
  //  console.log(scriptTsExport);
  fs.writeFileSync("./src/data/scriptTemplates.ts", scriptTsExport, "utf8");

  // slide themes
  const slideThemesDir = "./assets/slide_themes";
  const slideThemesObj: Record<string, unknown> = {};
  fs.readdirSync(slideThemesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .forEach((f) => {
      const name = path.basename(f, ".json");
      slideThemesObj[name] = JSON.parse(fs.readFileSync(path.join(slideThemesDir, f), "utf8"));
    });
  const slideThemesData = util.inspect(slideThemesObj, { depth: null, compact: false, sorted: true, breakLength: 120 });
  fs.writeFileSync("./src/data/slideThemes.ts", `export const slideThemes = ${slideThemesData}\n`, "utf8");

  // slide styles
  const stylesDir = "./assets/styles";
  const slideStylesObj: Record<string, unknown> = {};
  fs.readdirSync(stylesDir)
    .filter((f) => f.startsWith("slide_") && f.endsWith(".json"))
    .sort()
    .forEach((f) => {
      const name = path.basename(f, ".json");
      slideStylesObj[name] = JSON.parse(fs.readFileSync(path.join(stylesDir, f), "utf8"));
    });
  const slideStylesData = util.inspect(slideStylesObj, { depth: null, compact: false, sorted: true, breakLength: 120 });
  fs.writeFileSync("./src/data/slideStyles.ts", `export const slideStyles = ${slideStylesData}\n`, "utf8");
};

main();
