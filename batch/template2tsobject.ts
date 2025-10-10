import { getAvailablePromptTemplates, getAvailableScriptTemplates, readTemplatePrompt } from "../src/utils/file.js";
import fs from "fs";
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
};

main();
