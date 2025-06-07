import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { MulmoStudioContext, PDFMode, PDFSize } from "../types/index.js";
import { MulmoScriptMethods } from "../methods/index.js";
import { localizedText, isHttp } from "../utils/utils.js";
import { getOutputPdfFilePath, writingMessage, getHTMLFile } from "../utils/file.js";
import { interpolate } from "../utils/markdown.js";
import { MulmoStudioMethods } from "../methods/mulmo_studio.js";

const isCI = process.env.CI === "true";

type PDFOptions = {
  format?: "Letter" | "A4";
  landscape?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
};

const getPdfSize = (pdfSize: PDFSize) => {
  return pdfSize === "a4" ? "A4" : "Letter";
};

const loadImage = async (imagePath: string): Promise<string> => {
  try {
    const imageData = isHttp(imagePath) ? Buffer.from(await (await fetch(imagePath)).arrayBuffer()) : fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase().replace(".", "");
    const mimeType = ext === "jpg" ? "jpeg" : ext;
    return `data:image/${mimeType};base64,${imageData.toString("base64")}`;
  } catch (__error) {
    const placeholderData = fs.readFileSync("assets/images/mulmocast_credit.png");
    return `data:image/png;base64,${placeholderData.toString("base64")}`;
  }
};

const formatTextAsParagraphs = (text: string): string =>
  text
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");

const generateSlideHTML = (imageDataUrls: string[]): string =>
  imageDataUrls
    .map(
      (imageUrl) => `
      <div class="page">
        <img src="${imageUrl}" alt="">
      </div>`,
    )
    .join("");

const generateTalkHTML = (imageDataUrls: string[], texts: string[]): string =>
  imageDataUrls
    .map(
      (imageUrl, index) => `
      <div class="page">
        <div class="image-container">
          <img src="${imageUrl}" alt="">
        </div>
        <div class="text-container">
          ${formatTextAsParagraphs(texts[index])}
        </div>
      </div>`,
    )
    .join("");

const generateHandoutHTML = (imageDataUrls: string[], texts: string[]): string => {
  const itemsPerPage = 4;
  const pages: string[] = [];

  for (let i = 0; i < imageDataUrls.length; i += itemsPerPage) {
    const pageItems = Array.from({ length: Math.min(itemsPerPage, imageDataUrls.length - i) }, (_, j) => {
      const index = i + j;
      return `
        <div class="handout-item">
          <div class="handout-image">
            <img src="${imageDataUrls[index]}" alt="">
          </div>
          <div class="handout-text">
            ${formatTextAsParagraphs(texts[index])}
          </div>
        </div>`;
    }).join("");

    pages.push(`<div class="page">${pageItems}</div>`);
  }

  return pages.join("");
};

const generatePagesHTML = (pdfMode: PDFMode, imageDataUrls: string[], texts: string[]): string => {
  switch (pdfMode) {
    case "slide":
      return generateSlideHTML(imageDataUrls);
    case "talk":
      return generateTalkHTML(imageDataUrls, texts);
    case "handout":
      return generateHandoutHTML(imageDataUrls, texts);
    default:
      return "";
  }
};

const getHandoutTemplateData = (isLandscapeImage: boolean): Record<string, string> => ({
  page_layout: isLandscapeImage ? "flex" : "grid",
  page_direction: isLandscapeImage ? "flex-direction: column;" : "grid-template-columns: repeat(4, 1fr);",
  flex_direction: isLandscapeImage ? "row" : "column",
  image_size: isLandscapeImage ? "width: 45%;" : "height: 60%;",
  text_size: isLandscapeImage ? "width: 55%;" : "height: 40%;",
  item_flex: isLandscapeImage ? "flex: 1;" : "",
});

const generatePDFHTML = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize): Promise<string> => {
  const { studio, lang = "en" } = context;
  const { multiLingual } = studio;

  const { width: imageWidth, height: imageHeight } = MulmoScriptMethods.getCanvasSize(studio.script);
  const isLandscapeImage = imageWidth > imageHeight;

  const imagePaths = studio.beats.map((beat) => beat.imageFile!);
  const texts = studio.script.beats.map((beat, index) => localizedText(beat, multiLingual?.[index], lang));

  const imageDataUrls = await Promise.all(imagePaths.map(loadImage));
  const pageSize = `${getPdfSize(pdfSize)} ${isLandscapeImage ? "landscape" : "portrait"}`;
  const pagesHTML = generatePagesHTML(pdfMode, imageDataUrls, texts);

  const template = getHTMLFile(`pdf_${pdfMode}`);
  const baseTemplateData: Record<string, string> = {
    lang,
    title: studio.script.title || "MulmoCast PDF",
    page_size: pageSize,
    pages: pagesHTML,
  };

  const templateData = pdfMode === "handout" ? { ...baseTemplateData, ...getHandoutTemplateData(isLandscapeImage) } : baseTemplateData;

  return interpolate(template, templateData);
};

const createPDFOptions = (pdfSize: PDFSize, pdfMode: PDFMode, isLandscapeImage: boolean): PDFOptions => {
  const baseOptions: PDFOptions = {
    format: getPdfSize(pdfSize),
    margin: {
      top: "0",
      bottom: "0",
      left: "0",
      right: "0",
    },
  };

  return pdfMode === "handout" && !isLandscapeImage ? { ...baseOptions, landscape: true } : baseOptions;
};

const generatePDFWithPuppeteer = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize): Promise<void> => {
  const { studio, fileDirs, lang = "en" } = context;
  const { outDirPath } = fileDirs;
  const { width: imageWidth, height: imageHeight } = MulmoScriptMethods.getCanvasSize(studio.script);
  const isLandscapeImage = imageWidth > imageHeight;

  const outputPdfPath = getOutputPdfFilePath(outDirPath, studio.filename, pdfMode, lang);
  const html = await generatePDFHTML(context, pdfMode, pdfSize);
  const pdfOptions = createPDFOptions(pdfSize, pdfMode, isLandscapeImage);

  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox"] : [],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPdfPath,
      printBackground: true,
      ...pdfOptions,
    });
    writingMessage(outputPdfPath);
  } finally {
    await browser.close();
  }
};

export const pdfPuppeteer = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize): Promise<void> => {
  try {
    MulmoStudioMethods.setSessionState(context.studio, "pdf", true);
    await generatePDFWithPuppeteer(context, pdfMode, pdfSize);
  } finally {
    MulmoStudioMethods.setSessionState(context.studio, "pdf", false);
  }
};
