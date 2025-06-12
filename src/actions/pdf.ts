import fs from "fs";
import path from "path";
import { rgb, PDFDocument, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { chunkArray, isHttp, localizedText } from "../utils/utils.js";
import { getOutputPdfFilePath, writingMessage } from "../utils/file.js";

import { MulmoStudioContext, PDFMode, PDFSize } from "../types/index.js";
import { MulmoScriptMethods } from "../methods/index.js";

import { fontSize, textMargin, drawSize, wrapText } from "../utils/pdf.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";

const imagesPerPage = 4;
const offset = 10;
const handoutImageRatio = 0.5;

const readImage = async (imagePath: string, pdfDoc: PDFDocument) => {
  const imageBytes = await (async () => {
    if (isHttp(imagePath)) {
      const res = await fetch(imagePath);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    return fs.readFileSync(imagePath);
  })();

  const ext = path.extname(imagePath).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") {
    return await pdfDoc.embedJpg(imageBytes);
  }
  if (ext === ".png") {
    return await pdfDoc.embedPng(imageBytes);
  }
  // workaround. TODO: movie, image should convert to png/jpeg image
  return await pdfDoc.embedPng(fs.readFileSync("assets/images/mulmocast_credit.png"));
};

const pdfSlide = async (pageWidth: number, pageHeight: number, imagePaths: string[], pdfDoc: PDFDocument) => {
  const cellRatio = pageHeight / pageWidth;
  for (const imagePath of imagePaths) {
    const image = await readImage(imagePath, pdfDoc);

    const { width: origWidth, height: origHeight } = image.scale(1);
    const originalRatio = origHeight / origWidth;
    const fitWidth = originalRatio / cellRatio < 1;
    const { drawWidth, drawHeight } = drawSize(fitWidth, pageWidth, pageHeight, origWidth, origHeight);

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: drawWidth,
      height: drawHeight,
    });
  }
};

const pdfTalk = async (pageWidth: number, pageHeight: number, imagePaths: string[], texts: string[], pdfDoc: PDFDocument, font: PDFFont) => {
  const imageRatio = 0.7;
  const textMargin = 8;
  const textY = pageHeight * (1 - imageRatio) - textMargin;

  const targetWidth = pageWidth - offset;
  const targetHeight = pageHeight * imageRatio - offset;

  const cellRatio = targetHeight / targetWidth;

  for (const [index, imagePath] of imagePaths.entries()) {
    const text = texts[index];
    const image = await readImage(imagePath, pdfDoc);

    const { width: origWidth, height: origHeight } = image.scale(1);
    const originalRatio = origHeight / origWidth;
    const fitWidth = originalRatio / cellRatio < 1;
    const { drawWidth, drawHeight } = drawSize(fitWidth, targetWidth, targetHeight, origWidth, origHeight);

    const x = (pageWidth - drawWidth) / 2;
    const y = pageHeight - drawHeight - offset;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pos = {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    };
    page.drawImage(image, pos);
    page.drawRectangle({
      ...pos,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const lines = wrapText(text, font, fontSize, pageWidth - textMargin * 2);

    for (const [index, line] of lines.entries()) {
      page.drawText(line, {
        x: textMargin,
        y: textY - fontSize - (fontSize + 2) * index,
        size: fontSize,
        color: rgb(0, 0, 0),
        maxWidth: pageWidth - 2 * textMargin,
        font,
      });
    }
  }
};

const pdfHandout = async (
  pageWidth: number,
  pageHeight: number,
  imagePaths: string[],
  texts: string[],
  pdfDoc: PDFDocument,
  font: PDFFont,
  isLandscapeImage: boolean,
) => {
  const cellRatio = (pageHeight / imagesPerPage - offset) / (pageWidth * handoutImageRatio - offset);

  let index = 0;
  for (const chunkPaths of chunkArray<string>(imagePaths, imagesPerPage)) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    for (let i = 0; i < chunkPaths.length; i++) {
      const imagePath = chunkPaths[i];
      const image = await readImage(imagePath, pdfDoc);

      const { width: origWidth, height: origHeight } = image.scale(1);
      const originalRatio = origHeight / origWidth;

      const fitWidth = originalRatio / cellRatio < 1;
      const pos = (() => {
        if (isLandscapeImage) {
          const cellHeight = pageHeight / imagesPerPage - offset;

          const { drawWidth, drawHeight, containerWidth } = drawSize(
            fitWidth,
            (pageWidth - offset) * handoutImageRatio,
            cellHeight - offset,
            origWidth,
            origHeight,
          );

          const x = offset + (containerWidth - drawWidth) / 2;
          const y = pageHeight - (i + 1) * cellHeight + (cellHeight - drawHeight) * handoutImageRatio;
          return {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
            containerWidth,
          };
        } else {
          const cellWidth = pageWidth / imagesPerPage;
          const { drawWidth, drawHeight, containerWidth } = drawSize(
            fitWidth,
            cellWidth - offset,
            (pageHeight - offset) * handoutImageRatio,
            origWidth,
            origHeight,
          );

          const x = pageWidth - (imagesPerPage - i) * cellWidth + (cellWidth - drawWidth) * handoutImageRatio;
          const y = pageHeight - drawHeight - offset;

          return {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
            containerWidth,
          };
        }
      })();
      page.drawRectangle({
        ...pos,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      page.drawImage(image, pos);

      if (isLandscapeImage) {
        const lines = wrapText(texts[index], font, fontSize, pos.width - textMargin * 2);

        for (const [index, line] of lines.entries()) {
          page.drawText(line, {
            ...pos,
            x: offset + pos.containerWidth + textMargin,
            y: pos.y + pos.height - fontSize - (fontSize + 2) * index,
            size: fontSize,
            font,
          });
        }
        /*
        page.drawRectangle({
          ...pos,
          x: pos.x +  pos.width ,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          });
        */
      } else {
        const lines = wrapText(texts[index], font, fontSize, pos.width - textMargin * 2);
        for (const [index, line] of lines.entries()) {
          page.drawText(line, {
            ...pos,
            x: pos.x,
            y: textMargin + pos.height - fontSize - (fontSize + textMargin) * index - 2 * textMargin,
            size: fontSize,
            font,
          });
        }
        /*
        page.drawRectangle({
          ...pos,
          x: pos.x,
          y: textMargin,
          height: pos.height - 2 * textMargin,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        */
      }
      index = index + 1;
    }
  }
};

const outputSize = (pdfSize: PDFSize, isLandscapeImage: boolean, isRotate: boolean) => {
  if (pdfSize === "a4") {
    if (isLandscapeImage !== isRotate) {
      return { width: 841.89, height: 595.28 };
    }
    return { width: 595.28, height: 841.89 };
  }
  // letter
  if (isLandscapeImage !== isRotate) {
    return { width: 792, height: 612 };
  }
  return { width: 612, height: 792 };
};

const generatePdf = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize) => {
  const { studio, fileDirs, lang } = context;
  const { multiLingual } = studio;
  const { outDirPath } = fileDirs;

  const { width: imageWidth, height: imageHeight } = MulmoScriptMethods.getCanvasSize(studio.script);
  const isLandscapeImage = imageWidth > imageHeight;

  const isRotate = pdfMode === "handout";
  const { width: pageWidth, height: pageHeight } = outputSize(pdfSize, isLandscapeImage, isRotate);

  const imagePaths = studio.beats.map((beat) => beat.imageFile!);
  const texts = studio.script.beats.map((beat, index) => {
    return localizedText(beat, multiLingual?.[index], lang);
  });

  const outputPdfPath = getOutputPdfFilePath(outDirPath, studio.filename, pdfMode, lang);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = fs.readFileSync(new URL('../../assets/font/NotoSansJP-Regular.ttf', import.meta.url));
  const customFont = await pdfDoc.embedFont(fontBytes);

  if (pdfMode === "handout") {
    await pdfHandout(pageWidth, pageHeight, imagePaths, texts, pdfDoc, customFont, isLandscapeImage);
  }
  if (pdfMode === "slide") {
    await pdfSlide(pageWidth, pageHeight, imagePaths, pdfDoc);
  }
  if (pdfMode === "talk") {
    await pdfTalk(pageWidth, pageHeight, imagePaths, texts, pdfDoc, customFont);
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  writingMessage(outputPdfPath);
};

export const pdf = async (context: MulmoStudioContext, pdfMode: PDFMode, pdfSize: PDFSize) => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "pdf", true);
    await generatePdf(context, pdfMode, pdfSize);
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "pdf", false);
  }
};
