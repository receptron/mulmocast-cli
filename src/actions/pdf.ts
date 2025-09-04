import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { GraphAILogger, sleep } from "graphai";
import { MulmoStudioContext, PDFMode, PDFSize } from "../types/index.js";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { localizedText, isHttp } from "../utils/utils.js";
import { getOutputPdfFilePath, writingMessage, getHTMLFile } from "../utils/file.js";
import { interpolate } from "../utils/markdown.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

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
  } catch (error) {
    GraphAILogger.info("loadImage failed", error);
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
    const pageItems = Array.from({ length: itemsPerPage }, (_, j) => {
      const index = i + j;
      const hasContent = index < imageDataUrls.length;

      if (hasContent) {
        return `
          <div class="handout-item">
            <div class="handout-image">
              <img src="${imageDataUrls[index]}" alt="">
            </div>
            <div class="handout-text">
              ${formatTextAsParagraphs(texts[index])}
            </div>
          </div>`;
      } else {
        // Empty slot to maintain 4-item grid layout
        return `
          <div class="handout-item">
            <div class="handout-image"></div>
            <div class="handout-text"></div>
          </div>`;
      }
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
  const { studio, multiLingual, lang = "en" } = context;

  const { width: imageWidth, height: imageHeight } = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);
  const isLandscapeImage = imageWidth > imageHeight;

  const imagePaths = studio.beats.map((beat) => beat.imageFile!);
  const texts = studio.script.beats.map((beat, index) => localizedText(beat, multiLingual?.[index], lang));

  const imageDataUrls = await Promise.all(imagePaths.map(loadImage));
  const defaultPageSize = `${getPdfSize(pdfSize)} ${isLandscapeImage ? "landscape" : "portrait"}`;
  const pageSize = pdfMode === "handout" ? `${getPdfSize(pdfSize)} portrait` : defaultPageSize;
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

const createPDFOptions = (pdfSize: PDFSize, pdfMode: PDFMode): PDFOptions => {
  const baseOptions: PDFOptions = {
    format: getPdfSize(pdfSize),
    margin: {
      top: "0",
      bottom: "0",
      left: "0",
      right: "0",
    },
  };

  // handout mode always uses portrait orientation
  return pdfMode === "handout" ? { ...baseOptions, landscape: false } : baseOptions;
};

export const pdfFilePath = (context: MulmoStudioContext, pdfMode: PDFMode) => {
  const { studio, fileDirs, lang = "en" } = context;
  return getOutputPdfFilePath(fileDirs.outDirPath, studio.filename, pdfMode, lang);
};

const generatePDF = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize): Promise<void> => {
  const outputPdfPath = pdfFilePath(context, pdfMode);
  const html = await generatePDFHTML(context, pdfMode, pdfSize);
  const pdfOptions = createPDFOptions(pdfSize, pdfMode);

  const browser = await puppeteer.launch({
    args: isCI ? ["--no-sandbox"] : [],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await sleep(1000);
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

export const pdf = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "pdf", true);
    await generatePDF(context, pdfMode, pdfSize);
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "pdf", false);
  }
};
