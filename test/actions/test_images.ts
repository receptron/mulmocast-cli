import test from "node:test";
// import assert from "node:assert";
import { GraphAILogger } from "graphai";

import { getFileObject } from "../../src/cli/helpers.js";
import { createStudioData } from "../../src/utils/context.js";
import { images, generateBeatImage } from "../../src/actions/images.js";
import { addSessionProgressCallback } from "../../src/methods/mulmo_studio_context.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testMulmoScript = {
  $mulmocast: {
    version: "1.0",
    credit: "closing",
  },
  title: "MASAI: A Modular Future for Software Engineering AI",
  description: "Exploring MASAI, a modular approach for AI agents in software engineering that revolutionizes how complex coding issues are tackled.",
  beats: [
    {
      text: "This is a bulleted list in text slide format.",
      image: {
        type: "textSlide",
        slide: {
          title: "Human Evolution",
          bullets: [
            "Early Primates",
            "Hominids and Hominins",
            "Australopithecus",
            "Genus Homo Emerges",
            "Homo erectus and Migration",
            "Neanderthals and Other Archaic Humans",
            "Homo sapiens",
          ],
        },
      },
    },
    {
      text: "This is a table in markdown format.",
      image: {
        type: "markdown",
        markdown: [
          "# Markdown Table Example",
          "### Table",
          "| Item              | In Stock | Price |",
          "| :---------------- | :------: | ----: |",
          "| Python Hat        |   True   | 23.99 |",
          "| SQL Hat           |   True   | 23.99 |",
          "| Codecademy Tee    |  False   | 19.99 |",
          "| Codecademy Hoodie |  False   | 42.99 |",
          "### Paragraph",
          "This is a paragraph.",
        ],
      },
    },
    {
      text: "This is a chart in chart format.",
      image: {
        type: "chart",
        title: "Sales and Profits (from Jan to June)",
        chartData: {
          type: "bar",
          data: {
            labels: ["January", "February", "March", "April", "May", "June"],
            datasets: [
              {
                label: "Revenue ($1000s)",
                data: [120, 135, 180, 155, 170, 190],
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
              },
              {
                label: "Profit ($1000s)",
                data: [45, 52, 68, 53, 61, 73],
                backgroundColor: "rgba(75, 192, 192, 0.5)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            animation: false,
          },
        },
      },
    },
    {
      speaker: "Presenter",
      text: "This is a diagram in mermaid format.",
      image: {
        type: "mermaid",
        title: "Business Process Flow",
        code: {
          kind: "text",
          text: "graph LR\n    A[Market Research] --> B[Product Planning]\n    B --> C[Development]\n    C --> D[Testing]\n    D --> E[Manufacturing]\n    E --> F[Marketing]\n    F --> G[Sales]\n    G --> H[Customer Support]\n    H --> A",
        },
      },
    },
  ],
};

const getContext = () => {
  const fileDirs = getFileObject({ file: "hello.yaml" });
  const studio = createStudioData(testMulmoScript, "hello");
  const context = {
    studio,
    fileDirs,
    force: false,
    sessionState: {
      inSession: {
        audio: false,
        image: false,
        video: false,
        multiLingual: false,
        caption: false,
        pdf: false,
      },
      inBeatSession: {
        audio: {},
        image: {},
        movie: {},
        multiLingual: {},
        caption: {},
        html: {},
      },
    },
    presentationStyle: studio.script,
  };
  return context;
};

test("test images", async () => {
  // const fileDirs = getFileObject({ file: "hello.yaml", basedir: __dirname });
  addSessionProgressCallback((data) => {
    GraphAILogger.info(data);
  });
  const context = getContext();
  await images(context);
});

test("test beat images", async () => {
  // const fileDirs = getFileObject({ file: "hello.yaml", basedir: __dirname });
  const context = getContext();
  await generateBeatImage({ index: 1, context });
});
